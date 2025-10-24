/**
 * 🔄 Playlist Conversion Service
 * 
 * Implementa conversão de playlists entre plataformas:
 * - Busca de músicas equivalentes
 * - Mapeamento de metadados
 * - Criação automática em plataformas de destino
 * - Análise de compatibilidade
 */

import { Platform, Song, Playlist, PlaylistSong } from '@/types';
import { PlatformServiceFactory } from '@/factories';
import { PlaylistService, MusicService } from '@/services';
import { IPlatformService } from '@/services/integrations';
import { prisma } from '@/lib/database';

// ==================== TYPES ====================

export interface ConversionResult {
  success: boolean;
  originalPlaylist: {
    id: string;
    name: string;
    platform: Platform;
    songCount: number;
  };
  convertedPlaylist?: {
    id: string;
    name: string;
    platform: Platform;
    songCount: number;
    matchedSongs: number;
    unmatchedSongs: number;
    conversionRate: number;
  };
  errors: ConversionError[];
  warnings: string[];
}

export interface ConversionError {
  songId: string;
  songTitle: string;
  reason: string;
  platform: Platform;
}

export interface SongMatch {
  originalSong: Song;
  matchedSong?: Song;
  confidence: number;
  platform: Platform;
  isExactMatch: boolean;
}

export interface IPlaylistConversionService {
  convertPlaylist(
    playlistId: string, 
    targetPlatform: Platform, 
    userId: string
  ): Promise<ConversionResult>;
  
  analyzeCompatibility(
    playlistId: string, 
    targetPlatform: Platform
  ): Promise<{
    compatibility: number;
    estimatedMatches: number;
    potentialIssues: string[];
  }>;
  
  getConversionHistory(userId: string): Promise<any[]>;
  
  previewConversion(
    playlistId: string, 
    targetPlatform: Platform
  ): Promise<SongMatch[]>;
}

export class PlaylistConversionService implements IPlaylistConversionService {
  constructor(
    private playlistService: PlaylistService,
    private musicService: MusicService
  ) {}

  /**
   * Converte playlist de uma plataforma para outra
   */
  async convertPlaylist(
    playlistId: string, 
    targetPlatform: Platform, 
    userId: string
  ): Promise<ConversionResult> {
    try {
      console.log(`🔄 Converting playlist ${playlistId} to ${targetPlatform}`);

      // 1. Buscar playlist original
      const originalPlaylist = await this.playlistService.getPlaylistById(playlistId, userId);
      if (!originalPlaylist) {
        throw new Error('Playlist not found');
      }

      // 2. Verificar se já existe conversão
      const existingConversion = await prisma.playlistConversion.findFirst({
        where: {
          originalPlaylistId: playlistId,
          targetPlatform: targetPlatform.toUpperCase() as any
        }
      });

      if (existingConversion) {
        throw new Error('Playlist already converted to this platform');
      }

      // 3. Analisar compatibilidade
      const compatibility = await this.analyzeCompatibility(playlistId, targetPlatform);
      
      if (compatibility.compatibility < 0.3) {
        throw new Error(`Low compatibility (${Math.round(compatibility.compatibility * 100)}%) with ${targetPlatform}`);
      }

      // 4. Buscar músicas equivalentes
      const songMatches = await this.findEquivalentSongs(originalPlaylist.songs, targetPlatform);

      // 5. Criar playlist na plataforma de destino
      const targetService = PlatformServiceFactory.create(targetPlatform);
      const accessToken = await this.getPlatformAccessToken(targetPlatform, userId);
      
      if (!accessToken) {
        throw new Error(`No access token available for ${targetPlatform}`);
      }

      // 6. Criar playlist na plataforma externa
      const convertedPlaylistName = `${originalPlaylist.name} (Converted from ${originalPlaylist.platform})`;
      const externalPlaylist = await targetService.createPlaylist(
        accessToken,
        convertedPlaylistName,
        `Playlist convertida de ${originalPlaylist.platform} para ${targetPlatform}`
      );

      // 7. Adicionar músicas encontradas
      const matchedSongs = songMatches.filter(match => match.matchedSong);
      const matchedSongIds = matchedSongs.map(match => match.matchedSong!.platformId);
      
      if (matchedSongIds.length > 0) {
        await targetService.addTracksToPlaylist(
          accessToken,
          externalPlaylist.id,
          matchedSongIds
        );
      }

      // 8. Salvar conversão no banco
      const conversion = await prisma.playlistConversion.create({
        data: {
          originalPlaylistId: playlistId,
          targetPlatform: targetPlatform.toUpperCase() as any,
          convertedPlaylistId: externalPlaylist.id,
          status: 'COMPLETED',
          matchedSongs: matchedSongs.length,
          unmatchedSongs: songMatches.length - matchedSongs.length,
          conversionRate: matchedSongs.length / songMatches.length,
          errors: songMatches
            .filter(match => !match.matchedSong)
            .map(match => ({
              songId: match.originalSong.id,
              songTitle: match.originalSong.title,
              reason: 'No equivalent song found',
              platform: targetPlatform
            }))
        }
      });

      // 9. Criar playlist local para referência
      const localConvertedPlaylist = await this.playlistService.createPlaylist({
        name: convertedPlaylistName,
        description: `Playlist convertida de ${originalPlaylist.platform} para ${targetPlatform}`,
        platform: targetPlatform,
        playlistType: 'converted',
        userId,
        isPublic: false,
        songs: matchedSongs.map((match, index) => ({
          songId: match.matchedSong!.id,
          position: index,
          addedBy: userId
        }))
      });

      const result: ConversionResult = {
        success: true,
        originalPlaylist: {
          id: originalPlaylist.id,
          name: originalPlaylist.name,
          platform: originalPlaylist.platform,
          songCount: originalPlaylist.songs.length
        },
        convertedPlaylist: {
          id: localConvertedPlaylist.id,
          name: localConvertedPlaylist.name,
          platform: targetPlatform,
          songCount: matchedSongs.length,
          matchedSongs: matchedSongs.length,
          unmatchedSongs: songMatches.length - matchedSongs.length,
          conversionRate: conversion.conversionRate
        },
        errors: conversion.errors as ConversionError[],
        warnings: compatibility.potentialIssues
      };

      console.log(`✅ Conversion completed: ${matchedSongs.length}/${songMatches.length} songs matched`);
      return result;

    } catch (error) {
      console.error('Playlist conversion failed:', error);
      
      // Salvar erro no banco
      await prisma.playlistConversion.create({
        data: {
          originalPlaylistId: playlistId,
          targetPlatform: targetPlatform.toUpperCase() as any,
          status: 'FAILED',
          errors: [{
            songId: '',
            songTitle: '',
            reason: error.message,
            platform: targetPlatform
          }]
        }
      });

      return {
        success: false,
        originalPlaylist: {
          id: playlistId,
          name: '',
          platform: 'spotify' as Platform,
          songCount: 0
        },
        errors: [{
          songId: '',
          songTitle: '',
          reason: error.message,
          platform: targetPlatform
        }],
        warnings: []
      };
    }
  }

  /**
   * Analisa compatibilidade entre playlist e plataforma de destino
   */
  async analyzeCompatibility(
    playlistId: string, 
    targetPlatform: Platform
  ): Promise<{
    compatibility: number;
    estimatedMatches: number;
    potentialIssues: string[];
  }> {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        songs: {
          include: { song: true }
        }
      }
    });

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const songs = playlist.songs.map(ps => ps.song);
    const issues: string[] = [];
    let compatibility = 1.0;

    // Análise baseada em gêneros
    const genres = songs.map(s => s.genre).filter(Boolean);
    const uniqueGenres = [...new Set(genres)];

    // Verificar disponibilidade de gêneros por plataforma
    switch (targetPlatform) {
      case 'spotify':
        if (uniqueGenres.some(g => g?.includes('classical'))) {
          compatibility -= 0.1;
          issues.push('Classical music may have limited availability on Spotify');
        }
        break;
      case 'youtube':
        if (uniqueGenres.some(g => g?.includes('explicit'))) {
          compatibility -= 0.2;
          issues.push('Explicit content may be restricted on YouTube');
        }
        break;
      case 'apple':
        if (uniqueGenres.some(g => g?.includes('indie'))) {
          compatibility -= 0.15;
          issues.push('Indie music may have limited availability on Apple Music');
        }
        break;
    }

    // Análise baseada em anos
    const years = songs.map(s => s.year).filter(Boolean);
    const avgYear = years.reduce((a, b) => a + b!, 0) / years.length;
    
    if (avgYear < 1990) {
      compatibility -= 0.2;
      issues.push('Older music may have limited availability');
    }

    // Análise baseada em duração
    const avgDuration = songs.reduce((a, b) => a + b.duration, 0) / songs.length;
    if (avgDuration > 600) { // Mais de 10 minutos
      compatibility -= 0.1;
      issues.push('Very long songs may not be available on all platforms');
    }

    // Estimar matches baseado em compatibilidade
    const estimatedMatches = Math.floor(songs.length * compatibility);

    return {
      compatibility: Math.max(0, compatibility),
      estimatedMatches,
      potentialIssues: issues
    };
  }

  /**
   * Busca histórico de conversões do usuário
   */
  async getConversionHistory(userId: string): Promise<any[]> {
    const conversions = await prisma.playlistConversion.findMany({
      where: {
        originalPlaylist: {
          userId
        }
      },
      include: {
        originalPlaylist: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return conversions.map(conversion => ({
      id: conversion.id,
      originalPlaylist: {
        id: conversion.originalPlaylist.id,
        name: conversion.originalPlaylist.name,
        platform: conversion.originalPlaylist.platform
      },
      targetPlatform: conversion.targetPlatform,
      status: conversion.status,
      matchedSongs: conversion.matchedSongs,
      unmatchedSongs: conversion.unmatchedSongs,
      conversionRate: conversion.conversionRate,
      createdAt: conversion.createdAt,
      completedAt: conversion.completedAt
    }));
  }

  /**
   * Preview da conversão sem executar
   */
  async previewConversion(
    playlistId: string, 
    targetPlatform: Platform
  ): Promise<SongMatch[]> {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        songs: {
          include: { song: true }
        }
      }
    });

    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const songs = playlist.songs.map(ps => ps.song);
    return this.findEquivalentSongs(songs, targetPlatform);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Busca músicas equivalentes em outra plataforma
   */
  private async findEquivalentSongs(songs: Song[], targetPlatform: Platform): Promise<SongMatch[]> {
    const matches: SongMatch[] = [];

    for (const song of songs) {
      try {
        const match = await this.findEquivalentSong(song, targetPlatform);
        matches.push(match);
      } catch (error) {
        matches.push({
          originalSong: song,
          confidence: 0,
          platform: targetPlatform,
          isExactMatch: false
        });
      }
    }

    return matches;
  }

  /**
   * Busca música equivalente para uma música específica
   */
  private async findEquivalentSong(originalSong: Song, targetPlatform: Platform): Promise<SongMatch> {
    const searchQueries = this.generateSearchQueries(originalSong);
    let bestMatch: Song | null = null;
    let bestConfidence = 0;

    for (const query of searchQueries) {
      try {
        const results = await this.musicService.searchSongs({
          query,
          platform: targetPlatform,
          limit: 5
        });

        for (const result of results) {
          const confidence = this.calculateMatchConfidence(originalSong, result);
          
          if (confidence > bestConfidence) {
            bestMatch = result;
            bestConfidence = confidence;
          }
        }
      } catch (error) {
        console.warn(`Search failed for query "${query}":`, error);
      }
    }

    return {
      originalSong,
      matchedSong: bestMatch || undefined,
      confidence: bestConfidence,
      platform: targetPlatform,
      isExactMatch: bestConfidence > 0.8
    };
  }

  /**
   * Gera queries de busca para uma música
   */
  private generateSearchQueries(song: Song): string[] {
    const queries: string[] = [];

    // Query exata: artista + título
    queries.push(`"${song.artist}" "${song.title}"`);

    // Query simples: artista + título
    queries.push(`${song.artist} ${song.title}`);

    // Query com álbum
    if (song.album) {
      queries.push(`${song.artist} ${song.album}`);
    }

    // Query apenas título (para casos onde artista pode variar)
    queries.push(song.title);

    // Query apenas artista (para descobrir outras músicas)
    queries.push(song.artist);

    return queries;
  }

  /**
   * Calcula confiança de match entre duas músicas
   */
  private calculateMatchConfidence(original: Song, candidate: Song): number {
    let confidence = 0;

    // Match de título (peso: 40%)
    const titleSimilarity = this.calculateStringSimilarity(
      original.title.toLowerCase(),
      candidate.title.toLowerCase()
    );
    confidence += titleSimilarity * 0.4;

    // Match de artista (peso: 30%)
    const artistSimilarity = this.calculateStringSimilarity(
      original.artist.toLowerCase(),
      candidate.artist.toLowerCase()
    );
    confidence += artistSimilarity * 0.3;

    // Match de duração (peso: 20%)
    const durationDiff = Math.abs(original.duration - candidate.duration);
    const durationSimilarity = Math.max(0, 1 - (durationDiff / original.duration));
    confidence += durationSimilarity * 0.2;

    // Match de ano (peso: 10%)
    if (original.year && candidate.year) {
      const yearDiff = Math.abs(original.year - candidate.year);
      const yearSimilarity = Math.max(0, 1 - (yearDiff / 10)); // 10 anos de tolerância
      confidence += yearSimilarity * 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Calcula similaridade entre duas strings
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula distância de Levenshtein
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Obtém token de acesso de uma plataforma
   */
  private async getPlatformAccessToken(platform: Platform, userId: string): Promise<string | null> {
    const integration = await prisma.platformIntegration.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: platform.toUpperCase() as any
        }
      }
    });

    if (!integration || !integration.isActive) {
      return null;
    }

    // Verificar se token expirou
    if (integration.tokenExpiresAt < new Date()) {
      // Tentar renovar token
      try {
        const service = PlatformServiceFactory.create(platform);
        const authResult = await service.refreshToken(integration.refreshToken!);
        
        await prisma.platformIntegration.update({
          where: {
            userId_platform: {
              userId,
              platform: platform.toUpperCase() as any
            }
          },
          data: {
            accessToken: authResult.accessToken,
            tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000)
          }
        });

        return authResult.accessToken;
      } catch (error) {
        console.error(`Failed to refresh ${platform} token:`, error);
        return null;
      }
    }

    return integration.accessToken;
  }
}
