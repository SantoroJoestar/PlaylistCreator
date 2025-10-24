/**
 * 🧠 Smart Recommendations Service
 * 
 * Implementa sistema de recomendações inteligentes:
 * - Análise de histórico de música
 * - Algoritmos de machine learning
 * - Recomendações baseadas em humor
 * - Personalização por usuário
 */

import { Song, Playlist, Mood, User, AudioFeatures } from '@/types';
import { prisma } from '@/lib/database';
import { MusicService } from '@/services/music/MusicService';
import { MoodAnalysisService } from '@/services/mood/MoodAnalysisService';

// ==================== TYPES ====================

export interface RecommendationRequest {
  userId: string;
  mood?: Mood;
  genre?: string;
  limit?: number;
  excludePlayed?: boolean;
  includeAudioFeatures?: boolean;
}

export interface RecommendationResult {
  songs: RecommendedSong[];
  metadata: {
    totalRecommendations: number;
    confidence: number;
    algorithm: string;
    processingTime: number;
  };
}

export interface RecommendedSong extends Song {
  recommendationScore: number;
  recommendationReasons: string[];
  audioFeatures?: AudioFeatures;
}

export interface UserMusicProfile {
  userId: string;
  favoriteGenres: string[];
  favoriteArtists: string[];
  averageDuration: number;
  preferredTempo: number;
  preferredEnergy: number;
  preferredValence: number;
  listeningHistory: {
    totalSongs: number;
    uniqueArtists: number;
    uniqueGenres: number;
    averageSessionLength: number;
  };
}

export interface ISmartRecommendationsService {
  getPersonalizedRecommendations(request: RecommendationRequest): Promise<RecommendationResult>;
  getMoodBasedRecommendations(mood: Mood, userId: string, limit?: number): Promise<RecommendationResult>;
  getSimilarSongs(songId: string, userId: string, limit?: number): Promise<RecommendationResult>;
  getUserMusicProfile(userId: string): Promise<UserMusicProfile>;
  updateUserPreferences(userId: string, preferences: any): Promise<void>;
  getTrendingRecommendations(limit?: number): Promise<RecommendationResult>;
}

export class SmartRecommendationsService implements ISmartRecommendationsService {
  constructor(
    private musicService: MusicService,
    private moodAnalysisService: MoodAnalysisService
  ) {}

  /**
   * Obtém recomendações personalizadas para o usuário
   */
  async getPersonalizedRecommendations(request: RecommendationRequest): Promise<RecommendationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Generating personalized recommendations for user ${request.userId}`);

      // 1. Obter perfil musical do usuário
      const userProfile = await this.getUserMusicProfile(request.userId);

      // 2. Obter histórico de música do usuário
      const userHistory = await this.getUserMusicHistory(request.userId);

      // 3. Gerar recomendações usando múltiplos algoritmos
      const recommendations = await this.generateRecommendations({
        userProfile,
        userHistory,
        mood: request.mood,
        genre: request.genre,
        limit: request.limit || 20,
        excludePlayed: request.excludePlayed
      });

      // 4. Calcular confiança das recomendações
      const confidence = this.calculateRecommendationConfidence(userProfile, recommendations);

      const processingTime = Date.now() - startTime;

      return {
        songs: recommendations,
        metadata: {
          totalRecommendations: recommendations.length,
          confidence,
          algorithm: 'hybrid-personalized',
          processingTime
        }
      };

    } catch (error) {
      console.error('Personalized recommendations failed:', error);
      throw new Error('Failed to generate personalized recommendations');
    }
  }

  /**
   * Obtém recomendações baseadas em humor
   */
  async getMoodBasedRecommendations(mood: Mood, userId: string, limit = 20): Promise<RecommendationResult> {
    const startTime = Date.now();

    try {
      console.log(`😊 Generating mood-based recommendations for ${mood}`);

      // 1. Obter configuração do humor
      const moodConfig = await this.getMoodConfig(mood);

      // 2. Buscar músicas que correspondem ao humor
      const moodSongs = await this.findSongsByMood(moodConfig, limit * 2);

      // 3. Personalizar baseado no histórico do usuário
      const userProfile = await this.getUserMusicProfile(userId);
      const personalizedSongs = await this.personalizeMoodRecommendations(
        moodSongs,
        userProfile,
        limit
      );

      // 4. Adicionar características de áudio se disponível
      const songsWithFeatures = await this.enrichSongsWithAudioFeatures(personalizedSongs);

      const processingTime = Date.now() - startTime;

      return {
        songs: songsWithFeatures,
        metadata: {
          totalRecommendations: songsWithFeatures.length,
          confidence: 0.8, // Alto para recomendações de humor
          algorithm: 'mood-based',
          processingTime
        }
      };

    } catch (error) {
      console.error('Mood-based recommendations failed:', error);
      throw new Error('Failed to generate mood-based recommendations');
    }
  }

  /**
   * Obtém músicas similares a uma música específica
   */
  async getSimilarSongs(songId: string, userId: string, limit = 10): Promise<RecommendationResult> {
    const startTime = Date.now();

    try {
      console.log(`🎵 Finding similar songs to ${songId}`);

      // 1. Obter música de referência
      const referenceSong = await prisma.song.findUnique({
        where: { id: songId },
        include: { audioFeatures: true }
      });

      if (!referenceSong) {
        throw new Error('Reference song not found');
      }

      // 2. Buscar músicas similares usando características de áudio
      const similarSongs = await this.findSimilarSongsByAudioFeatures(referenceSong, limit * 2);

      // 3. Filtrar baseado no histórico do usuário
      const userProfile = await this.getUserMusicProfile(userId);
      const filteredSongs = await this.filterByUserPreferences(similarSongs, userProfile, limit);

      const processingTime = Date.now() - startTime;

      return {
        songs: filteredSongs,
        metadata: {
          totalRecommendations: filteredSongs.length,
          confidence: 0.7,
          algorithm: 'audio-features-similarity',
          processingTime
        }
      };

    } catch (error) {
      console.error('Similar songs recommendation failed:', error);
      throw new Error('Failed to find similar songs');
    }
  }

  /**
   * Obtém perfil musical do usuário
   */
  async getUserMusicProfile(userId: string): Promise<UserMusicProfile> {
    // Obter histórico de música do usuário
    const userPlaylists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        songs: {
          include: {
            song: {
              include: { audioFeatures: true }
            }
          }
        }
      }
    });

    const allSongs = userPlaylists.flatMap(playlist => 
      playlist.songs.map(ps => ps.song)
    );

    if (allSongs.length === 0) {
      return this.getDefaultUserProfile(userId);
    }

    // Analisar gêneros favoritos
    const genres = allSongs.map(s => s.genre).filter(Boolean);
    const genreCounts = this.countOccurrences(genres);
    const favoriteGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    // Analisar artistas favoritos
    const artists = allSongs.map(s => s.artist);
    const artistCounts = this.countOccurrences(artists);
    const favoriteArtists = Object.entries(artistCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([artist]) => artist);

    // Calcular métricas de áudio
    const songsWithFeatures = allSongs.filter(s => s.audioFeatures);
    const avgDuration = allSongs.reduce((sum, s) => sum + s.duration, 0) / allSongs.length;
    
    let avgTempo = 120;
    let avgEnergy = 0.5;
    let avgValence = 0.5;

    if (songsWithFeatures.length > 0) {
      avgTempo = songsWithFeatures.reduce((sum, s) => sum + s.audioFeatures!.tempo, 0) / songsWithFeatures.length;
      avgEnergy = songsWithFeatures.reduce((sum, s) => sum + s.audioFeatures!.energy, 0) / songsWithFeatures.length;
      avgValence = songsWithFeatures.reduce((sum, s) => sum + s.audioFeatures!.valence, 0) / songsWithFeatures.length;
    }

    return {
      userId,
      favoriteGenres,
      favoriteArtists,
      averageDuration: avgDuration,
      preferredTempo: avgTempo,
      preferredEnergy: avgEnergy,
      preferredValence: avgValence,
      listeningHistory: {
        totalSongs: allSongs.length,
        uniqueArtists: new Set(artists).size,
        uniqueGenres: new Set(genres).size,
        averageSessionLength: userPlaylists.length > 0 ? 
          allSongs.length / userPlaylists.length : 0
      }
    };
  }

  /**
   * Atualiza preferências do usuário
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...preferences,
          lastUpdated: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Obtém recomendações em alta
   */
  async getTrendingRecommendations(limit = 20): Promise<RecommendationResult> {
    const startTime = Date.now();

    try {
      // Buscar músicas mais populares baseado em playlists
      const trendingSongs = await prisma.song.findMany({
        include: {
          playlists: true,
          audioFeatures: true
        },
        orderBy: {
          playlists: {
            _count: 'desc'
        }
      },
      take: limit * 2
      });

      // Converter para formato de recomendação
      const recommendations = trendingSongs.map(song => ({
        ...song,
        recommendationScore: 0.8, // Alto para trending
        recommendationReasons: ['Trending song', 'Popular in playlists'],
        audioFeatures: song.audioFeatures || undefined
      }));

      const processingTime = Date.now() - startTime;

      return {
        songs: recommendations.slice(0, limit),
        metadata: {
          totalRecommendations: recommendations.length,
          confidence: 0.6,
          algorithm: 'trending-popularity',
          processingTime
        }
      };

    } catch (error) {
      console.error('Trending recommendations failed:', error);
      throw new Error('Failed to get trending recommendations');
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Gera recomendações usando múltiplos algoritmos
   */
  private async generateRecommendations(params: {
    userProfile: UserMusicProfile;
    userHistory: Song[];
    mood?: Mood;
    genre?: string;
    limit: number;
    excludePlayed: boolean;
  }): Promise<RecommendedSong[]> {
    const { userProfile, userHistory, mood, genre, limit, excludePlayed } = params;
    
    const recommendations: RecommendedSong[] = [];

    // 1. Recomendações baseadas em gêneros favoritos
    const genreRecommendations = await this.getRecommendationsByGenre(
      userProfile.favoriteGenres,
      limit / 3
    );
    recommendations.push(...genreRecommendations);

    // 2. Recomendações baseadas em artistas similares
    const artistRecommendations = await this.getRecommendationsByArtists(
      userProfile.favoriteArtists,
      limit / 3
    );
    recommendations.push(...artistRecommendations);

    // 3. Recomendações baseadas em características de áudio
    const audioRecommendations = await this.getRecommendationsByAudioFeatures(
      userProfile,
      limit / 3
    );
    recommendations.push(...audioRecommendations);

    // 4. Filtrar músicas já tocadas se solicitado
    const filteredRecommendations = excludePlayed ? 
      recommendations.filter(rec => !userHistory.some(song => song.id === rec.id)) :
      recommendations;

    // 5. Remover duplicatas e ordenar por score
    const uniqueRecommendations = this.removeDuplicateRecommendations(filteredRecommendations);
    const sortedRecommendations = uniqueRecommendations
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    return sortedRecommendations;
  }

  /**
   * Obtém recomendações baseadas em gêneros
   */
  private async getRecommendationsByGenre(genres: string[], limit: number): Promise<RecommendedSong[]> {
    const recommendations: RecommendedSong[] = [];

    for (const genre of genres.slice(0, 3)) { // Top 3 gêneros
      try {
        const songs = await this.musicService.getSongsByGenre(genre, undefined, Math.ceil(limit / genres.length));
        
        const genreRecommendations = songs.map(song => ({
          ...song,
          recommendationScore: 0.7,
          recommendationReasons: [`Similar genre: ${genre}`]
        }));

        recommendations.push(...genreRecommendations);
      } catch (error) {
        console.warn(`Failed to get recommendations for genre ${genre}:`, error);
      }
    }

    return recommendations;
  }

  /**
   * Obtém recomendações baseadas em artistas
   */
  private async getRecommendationsByArtists(artists: string[], limit: number): Promise<RecommendedSong[]> {
    const recommendations: RecommendedSong[] = [];

    for (const artist of artists.slice(0, 5)) { // Top 5 artistas
      try {
        const songs = await this.musicService.getSongsByArtist(artist, undefined, Math.ceil(limit / artists.length));
        
        const artistRecommendations = songs.map(song => ({
          ...song,
          recommendationScore: 0.6,
          recommendationReasons: [`Similar artist: ${artist}`]
        }));

        recommendations.push(...artistRecommendations);
      } catch (error) {
        console.warn(`Failed to get recommendations for artist ${artist}:`, error);
      }
    }

    return recommendations;
  }

  /**
   * Obtém recomendações baseadas em características de áudio
   */
  private async getRecommendationsByAudioFeatures(
    userProfile: UserMusicProfile, 
    limit: number
  ): Promise<RecommendedSong[]> {
    // Buscar músicas com características similares
    const songs = await prisma.song.findMany({
      include: { audioFeatures: true },
      take: limit * 3
    });

    const songsWithFeatures = songs.filter(s => s.audioFeatures);
    
    return songsWithFeatures
      .map(song => {
        const features = song.audioFeatures!;
        const tempoScore = 1 - Math.abs(features.tempo - userProfile.preferredTempo) / userProfile.preferredTempo;
        const energyScore = 1 - Math.abs(features.energy - userProfile.preferredEnergy);
        const valenceScore = 1 - Math.abs(features.valence - userProfile.preferredValence);
        
        const audioScore = (tempoScore + energyScore + valenceScore) / 3;

        return {
          ...song,
          recommendationScore: audioScore * 0.5,
          recommendationReasons: ['Similar audio characteristics'],
          audioFeatures: features
        };
      })
      .filter(song => song.recommendationScore > 0.3)
      .slice(0, limit);
  }

  /**
   * Obtém histórico de música do usuário
   */
  private async getUserMusicHistory(userId: string): Promise<Song[]> {
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        songs: {
          include: { song: true }
        }
      }
    });

    return playlists.flatMap(playlist => 
      playlist.songs.map(ps => ps.song)
    );
  }

  /**
   * Obtém configuração de humor
   */
  private async getMoodConfig(mood: Mood): Promise<any> {
    // Simulação - em produção, buscaria do banco ou arquivo de configuração
    const moodConfigs = {
      happy: { genres: ['pop', 'funk', 'disco'], energy: 0.8, valence: 0.9 },
      sad: { genres: ['blues', 'soul', 'indie'], energy: 0.3, valence: 0.2 },
      energetic: { genres: ['rock', 'electronic', 'metal'], energy: 0.9, valence: 0.7 },
      calm: { genres: ['ambient', 'classical', 'jazz'], energy: 0.2, valence: 0.5 },
      romantic: { genres: ['r&b', 'soul', 'pop'], energy: 0.5, valence: 0.8 },
      focused: { genres: ['ambient', 'electronic', 'classical'], energy: 0.4, valence: 0.6 }
    };

    return moodConfigs[mood];
  }

  /**
   * Busca músicas por humor
   */
  private async findSongsByMood(moodConfig: any, limit: number): Promise<Song[]> {
    const songs: Song[] = [];

    for (const genre of moodConfig.genres) {
      try {
        const genreSongs = await this.musicService.getSongsByGenre(genre, undefined, Math.ceil(limit / moodConfig.genres.length));
        songs.push(...genreSongs);
      } catch (error) {
        console.warn(`Failed to get songs for genre ${genre}:`, error);
      }
    }

    return songs.slice(0, limit);
  }

  /**
   * Personaliza recomendações de humor baseado no perfil do usuário
   */
  private async personalizeMoodRecommendations(
    songs: Song[], 
    userProfile: UserMusicProfile, 
    limit: number
  ): Promise<RecommendedSong[]> {
    return songs
      .map(song => {
        let score = 0.8; // Score base para humor
        const reasons = ['Mood-based recommendation'];

        // Bonus para gêneros favoritos
        if (song.genre && userProfile.favoriteGenres.includes(song.genre)) {
          score += 0.1;
          reasons.push('Favorite genre');
        }

        // Bonus para artistas favoritos
        if (userProfile.favoriteArtists.includes(song.artist)) {
          score += 0.1;
          reasons.push('Favorite artist');
        }

        return {
          ...song,
          recommendationScore: Math.min(1, score),
          recommendationReasons: reasons
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Enriquece músicas com características de áudio
   */
  private async enrichSongsWithAudioFeatures(songs: RecommendedSong[]): Promise<RecommendedSong[]> {
    return Promise.all(songs.map(async song => {
      if (!song.audioFeatures) {
        try {
          const features = await this.musicService.getAudioFeatures(song.id, song.platform);
          return { ...song, audioFeatures: features || undefined };
        } catch (error) {
          return song;
        }
      }
      return song;
    }));
  }

  /**
   * Busca músicas similares por características de áudio
   */
  private async findSimilarSongsByAudioFeatures(referenceSong: any, limit: number): Promise<RecommendedSong[]> {
    const songs = await prisma.song.findMany({
      include: { audioFeatures: true },
      where: {
        id: { not: referenceSong.id },
        platform: referenceSong.platform
      },
      take: limit * 2
    });

    const songsWithFeatures = songs.filter(s => s.audioFeatures);
    
    if (!referenceSong.audioFeatures) {
      return songsWithFeatures.slice(0, limit).map(song => ({
        ...song,
        recommendationScore: 0.5,
        recommendationReasons: ['Similar platform and genre'],
        audioFeatures: song.audioFeatures || undefined
      }));
    }

    return songsWithFeatures
      .map(song => {
        const features = song.audioFeatures!;
        const refFeatures = referenceSong.audioFeatures!;
        
        const danceabilityDiff = Math.abs(features.danceability - refFeatures.danceability);
        const energyDiff = Math.abs(features.energy - refFeatures.energy);
        const valenceDiff = Math.abs(features.valence - refFeatures.valence);
        const tempoDiff = Math.abs(features.tempo - refFeatures.tempo) / refFeatures.tempo;
        
        const similarity = 1 - (danceabilityDiff + energyDiff + valenceDiff + tempoDiff) / 4;

        return {
          ...song,
          recommendationScore: Math.max(0, similarity),
          recommendationReasons: ['Similar audio features'],
          audioFeatures: features
        };
      })
      .filter(song => song.recommendationScore > 0.3)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Filtra recomendações baseado nas preferências do usuário
   */
  private async filterByUserPreferences(
    songs: RecommendedSong[], 
    userProfile: UserMusicProfile, 
    limit: number
  ): Promise<RecommendedSong[]> {
    return songs
      .map(song => {
        let score = song.recommendationScore;
        const reasons = [...song.recommendationReasons];

        // Bonus para gêneros favoritos
        if (song.genre && userProfile.favoriteGenres.includes(song.genre)) {
          score += 0.1;
          reasons.push('Matches your favorite genre');
        }

        // Bonus para artistas favoritos
        if (userProfile.favoriteArtists.includes(song.artist)) {
          score += 0.1;
          reasons.push('Matches your favorite artist');
        }

        return {
          ...song,
          recommendationScore: Math.min(1, score),
          recommendationReasons: reasons
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Remove recomendações duplicadas
   */
  private removeDuplicateRecommendations(recommendations: RecommendedSong[]): RecommendedSong[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      const key = `${rec.title}-${rec.artist}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calcula confiança das recomendações
   */
  private calculateRecommendationConfidence(
    userProfile: UserMusicProfile, 
    recommendations: RecommendedSong[]
  ): number {
    if (recommendations.length === 0) return 0;

    const avgScore = recommendations.reduce((sum, rec) => sum + rec.recommendationScore, 0) / recommendations.length;
    const profileCompleteness = userProfile.listeningHistory.totalSongs > 10 ? 1 : userProfile.listeningHistory.totalSongs / 10;
    
    return avgScore * profileCompleteness;
  }

  /**
   * Conta ocorrências em array
   */
  private countOccurrences<T>(array: T[]): Record<string, number> {
    return array.reduce((counts, item) => {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Obtém perfil padrão para usuários novos
   */
  private getDefaultUserProfile(userId: string): UserMusicProfile {
    return {
      userId,
      favoriteGenres: ['pop', 'rock'],
      favoriteArtists: [],
      averageDuration: 240,
      preferredTempo: 120,
      preferredEnergy: 0.5,
      preferredValence: 0.5,
      listeningHistory: {
        totalSongs: 0,
        uniqueArtists: 0,
        uniqueGenres: 0,
        averageSessionLength: 0
      }
    };
  }
}
