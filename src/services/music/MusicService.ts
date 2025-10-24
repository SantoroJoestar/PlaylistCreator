/**
 * 🎶 Music Service - Model Layer
 * 
 * Este service implementa a lógica de negócio para música:
 * - Busca e validação de músicas
 * - Integração com plataformas externas
 * - Análise de características musicais
 * - Segue Single Responsibility Principle
 */

import { Song, SearchSongParams, AudioFeatures, Platform } from '@/types';
import { ISongRepository } from '@/repositories';
import { IPlatformService } from '@/factories';
import { PlatformServiceFactory } from '@/factories';

export interface IMusicService {
  searchSongs(params: SearchSongParams): Promise<Song[]>;
  getSongDetails(songId: string, platform: Platform): Promise<Song | null>;
  getAudioFeatures(songId: string, platform: Platform): Promise<AudioFeatures | null>;
  addSongToDatabase(song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Promise<Song>;
  findSimilarSongs(songId: string, limit?: number): Promise<Song[]>;
  getSongsByGenre(genre: string, platform?: Platform, limit?: number): Promise<Song[]>;
  getSongsByArtist(artist: string, platform?: Platform, limit?: number): Promise<Song[]>;
}

export class MusicService implements IMusicService {
  constructor(
    private songRepository: ISongRepository,
    private platformServices: Map<Platform, IPlatformService> = new Map()
  ) {}

  /**
   * Busca músicas em todas as plataformas ou plataforma específica
   */
  async searchSongs(params: SearchSongParams): Promise<Song[]> {
    const { query, platform, limit = 20, offset = 0, genre, year } = params;

    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    let songs: Song[] = [];

    if (platform) {
      // Buscar em plataforma específica
      songs = await this.searchInPlatform(query, platform, limit, offset, genre, year);
    } else {
      // Buscar em todas as plataformas
      const platforms: Platform[] = ['spotify', 'youtube', 'apple'];
      const songsPerPlatform = Math.ceil(limit / platforms.length);

      for (const platformKey of platforms) {
        try {
          const platformSongs = await this.searchInPlatform(
            query, 
            platformKey, 
            songsPerPlatform, 
            0, 
            genre, 
            year
          );
          songs.push(...platformSongs);
        } catch (error) {
          console.warn(`Failed to search in ${platformKey}:`, error);
        }
      }
    }

    // Remover duplicatas baseado no título e artista
    const uniqueSongs = this.removeDuplicateSongs(songs);

    return uniqueSongs.slice(0, limit);
  }

  /**
   * Busca detalhes de uma música específica
   */
  async getSongDetails(songId: string, platform: Platform): Promise<Song | null> {
    // Primeiro, tentar buscar no banco de dados
    let song = await this.songRepository.findById(songId);
    
    if (song) {
      return song;
    }

    // Se não encontrou, buscar na plataforma externa
    try {
      const platformService = this.getPlatformService(platform);
      const externalSong = await platformService.searchMusic(songId, 1);
      
      if (externalSong.length > 0) {
        // Converter formato da plataforma para nosso formato
        const convertedSong = this.convertExternalSong(externalSong[0], platform);
        
        // Salvar no banco de dados
        song = await this.addSongToDatabase(convertedSong);
        return song;
      }
    } catch (error) {
      console.error(`Failed to get song details from ${platform}:`, error);
    }

    return null;
  }

  /**
   * Busca características de áudio de uma música
   */
  async getAudioFeatures(songId: string, platform: Platform): Promise<AudioFeatures | null> {
    const song = await this.songRepository.findById(songId);
    
    if (!song) {
      throw new Error('Song not found');
    }

    // Se já temos as características salvas, retornar
    if (song.audioFeatures) {
      return song.audioFeatures;
    }

    // Buscar características na plataforma externa
    try {
      const platformService = this.getPlatformService(platform);
      
      // Simular busca de características (cada plataforma tem API diferente)
      const features = await this.fetchAudioFeaturesFromPlatform(songId, platform);
      
      if (features) {
        // Atualizar música com características
        await this.songRepository.update(songId, { audioFeatures: features });
        return features;
      }
    } catch (error) {
      console.error(`Failed to get audio features from ${platform}:`, error);
    }

    return null;
  }

  /**
   * Adiciona música ao banco de dados
   */
  async addSongToDatabase(song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Promise<Song> {
    // Verificar se já existe
    const existingSong = await this.songRepository.findByPlatformId(song.platform, song.platformId);
    
    if (existingSong) {
      return existingSong;
    }

    // Validar dados da música
    this.validateSongData(song);

    return this.songRepository.create(song);
  }

  /**
   * Encontra músicas similares baseado em características
   */
  async findSimilarSongs(songId: string, limit = 10): Promise<Song[]> {
    const song = await this.songRepository.findById(songId);
    
    if (!song) {
      throw new Error('Song not found');
    }

    // Buscar músicas do mesmo gênero
    let similarSongs = await this.songRepository.findByGenre(song.genre || '', limit * 2);
    
    // Filtrar pela mesma plataforma
    similarSongs = similarSongs.filter(s => s.platform === song.platform);
    
    // Remover a música original
    similarSongs = similarSongs.filter(s => s.id !== songId);

    // Se temos características de áudio, usar para encontrar músicas similares
    if (song.audioFeatures) {
      similarSongs = this.filterByAudioFeatures(similarSongs, song.audioFeatures);
    }

    return similarSongs.slice(0, limit);
  }

  /**
   * Busca músicas por gênero
   */
  async getSongsByGenre(genre: string, platform?: Platform, limit = 20): Promise<Song[]> {
    if (platform) {
      return this.songRepository.findByGenre(genre, limit);
    }

    // Buscar em todas as plataformas
    const allSongs = await this.songRepository.findByGenre(genre, limit);
    return allSongs.slice(0, limit);
  }

  /**
   * Busca músicas por artista
   */
  async getSongsByArtist(artist: string, platform?: Platform, limit = 20): Promise<Song[]> {
    return this.songRepository.findByArtist(artist, limit);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Busca músicas em uma plataforma específica
   */
  private async searchInPlatform(
    query: string, 
    platform: Platform, 
    limit: number, 
    offset: number,
    genre?: string,
    year?: number
  ): Promise<Song[]> {
    try {
      const platformService = this.getPlatformService(platform);
      const externalSongs = await platformService.searchMusic(query, limit);
      
      // Converter para nosso formato
      const songs = externalSongs.map(song => this.convertExternalSong(song, platform));
      
      // Filtrar por gênero se especificado
      let filteredSongs = songs;
      if (genre) {
        filteredSongs = songs.filter(song => 
          song.genre?.toLowerCase().includes(genre.toLowerCase())
        );
      }
      
      // Filtrar por ano se especificado
      if (year) {
        filteredSongs = filteredSongs.filter(song => song.year === year);
      }
      
      return filteredSongs;
    } catch (error) {
      console.error(`Failed to search in ${platform}:`, error);
      return [];
    }
  }

  /**
   * Obtém serviço de plataforma
   */
  private getPlatformService(platform: Platform): IPlatformService {
    if (!this.platformServices.has(platform)) {
      const service = PlatformServiceFactory.create(platform);
      this.platformServices.set(platform, service);
    }
    
    return this.platformServices.get(platform)!;
  }

  /**
   * Converte música de formato externo para nosso formato
   */
  private convertExternalSong(externalSong: any, platform: Platform): Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title: externalSong.name || externalSong.title || 'Unknown',
      artist: externalSong.artists?.[0]?.name || externalSong.artist || 'Unknown Artist',
      album: externalSong.album?.name || externalSong.album || undefined,
      duration: externalSong.duration_ms ? Math.floor(externalSong.duration_ms / 1000) : 0,
      genre: externalSong.genres?.[0] || undefined,
      year: externalSong.album?.release_date ? 
        new Date(externalSong.album.release_date).getFullYear() : undefined,
      platform,
      platformId: externalSong.id || externalSong.videoId || '',
      previewUrl: externalSong.preview_url || externalSong.previewUrl,
      imageUrl: externalSong.album?.images?.[0]?.url || externalSong.thumbnail?.url,
      audioFeatures: externalSong.audio_features ? this.convertAudioFeatures(externalSong.audio_features) : undefined
    };
  }

  /**
   * Converte características de áudio de formato externo
   */
  private convertAudioFeatures(externalFeatures: any): AudioFeatures {
    return {
      danceability: externalFeatures.danceability || 0,
      energy: externalFeatures.energy || 0,
      valence: externalFeatures.valence || 0,
      tempo: externalFeatures.tempo || 0,
      loudness: externalFeatures.loudness || 0,
      acousticness: externalFeatures.acousticness || 0,
      instrumentalness: externalFeatures.instrumentalness || 0,
      liveness: externalFeatures.liveness || 0,
      speechiness: externalFeatures.speechiness || 0
    };
  }

  /**
   * Valida dados da música
   */
  private validateSongData(song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (!song.title || song.title.trim().length === 0) {
      throw new Error('Song title is required');
    }

    if (!song.artist || song.artist.trim().length === 0) {
      throw new Error('Song artist is required');
    }

    if (!song.platformId || song.platformId.trim().length === 0) {
      throw new Error('Platform ID is required');
    }

    if (song.duration < 0) {
      throw new Error('Duration must be positive');
    }
  }

  /**
   * Remove músicas duplicadas
   */
  private removeDuplicateSongs(songs: Song[]): Song[] {
    const seen = new Set<string>();
    return songs.filter(song => {
      const key = `${song.title.toLowerCase()}-${song.artist.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Filtra músicas por características de áudio
   */
  private filterByAudioFeatures(songs: Song[], targetFeatures: AudioFeatures): Song[] {
    return songs.filter(song => {
      if (!song.audioFeatures) return false;
      
      const features = song.audioFeatures;
      const tolerance = 0.2; // 20% de tolerância
      
      return (
        Math.abs(features.danceability - targetFeatures.danceability) <= tolerance &&
        Math.abs(features.energy - targetFeatures.energy) <= tolerance &&
        Math.abs(features.valence - targetFeatures.valence) <= tolerance
      );
    });
  }

  /**
   * Busca características de áudio na plataforma
   */
  private async fetchAudioFeaturesFromPlatform(songId: string, platform: Platform): Promise<AudioFeatures | null> {
    // Simulação - em produção, cada plataforma teria sua própria implementação
    return {
      danceability: Math.random(),
      energy: Math.random(),
      valence: Math.random(),
      tempo: 120 + Math.random() * 60,
      loudness: -20 + Math.random() * 20,
      acousticness: Math.random(),
      instrumentalness: Math.random(),
      liveness: Math.random(),
      speechiness: Math.random()
    };
  }
}
