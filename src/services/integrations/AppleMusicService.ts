/**
 * 🎵 Apple Music Integration Service
 * 
 * Implementa integração com Apple Music API:
 * - Autenticação JWT
 * - Busca de músicas e álbuns
 * - Criação de playlists
 * - Análise de metadados
 */

import axios, { AxiosInstance } from 'axios';
import jwt from 'jsonwebtoken';
import { Platform, Song, AudioFeatures } from '@/types';

export interface AppleMusicTrack {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    genreNames: string[];
    releaseDate: string;
    previews?: Array<{
      url: string;
    }>;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
  };
  relationships?: {
    albums?: {
      data: Array<{
        id: string;
        attributes: {
          name: string;
          releaseDate: string;
        };
      }>;
    };
  };
}

export interface AppleMusicPlaylist {
  id: string;
  attributes: {
    name: string;
    description?: string;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
    playParams?: {
      id: string;
      kind: string;
    };
  };
  relationships?: {
    tracks?: {
      data: AppleMusicTrack[];
    };
  };
}

export interface AppleMusicSearchResult {
  results: {
    songs?: {
      data: AppleMusicTrack[];
    };
    albums?: {
      data: Array<{
        id: string;
        attributes: {
          name: string;
          artistName: string;
          releaseDate: string;
        };
      }>;
    };
  };
}

export interface IAppleMusicService {
  generateDeveloperToken(): string;
  searchSongs(query: string, limit?: number): Promise<AppleMusicTrack[]>;
  getSong(songId: string): Promise<AppleMusicTrack | null>;
  getUserPlaylists(userToken: string, limit?: number): Promise<AppleMusicPlaylist[]>;
  createPlaylist(userToken: string, name: string, description?: string): Promise<AppleMusicPlaylist>;
  addSongsToPlaylist(userToken: string, playlistId: string, songIds: string[]): Promise<void>;
  getUserProfile(userToken: string): Promise<any>;
}

export class AppleMusicService implements IAppleMusicService {
  private teamId: string;
  private keyId: string;
  private privateKey: string;
  private apiClient: AxiosInstance;

  constructor() {
    this.teamId = process.env.APPLE_TEAM_ID || '';
    this.keyId = process.env.APPLE_KEY_ID || '';
    this.privateKey = process.env.APPLE_PRIVATE_KEY || '';
    
    this.apiClient = axios.create({
      baseURL: 'https://api.music.apple.com/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Gera token de desenvolvedor JWT
   */
  generateDeveloperToken(): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      iss: this.teamId,
      iat: now,
      exp: now + (6 * 30 * 24 * 60 * 60), // 6 meses
      aud: 'https://appleid.apple.com',
      sub: this.teamId
    };

    const header = {
      alg: 'ES256',
      kid: this.keyId
    };

    return jwt.sign(payload, this.privateKey, { 
      algorithm: 'ES256',
      header 
    });
  }

  /**
   * Busca músicas no Apple Music
   */
  async searchSongs(query: string, limit = 20): Promise<AppleMusicTrack[]> {
    try {
      const developerToken = this.generateDeveloperToken();
      
      const response = await this.apiClient.get('/catalog/us/search', {
        headers: {
          Authorization: `Bearer ${developerToken}`
        },
        params: {
          term: query,
          types: 'songs',
          limit,
          offset: 0
        }
      });

      return response.data.results.songs?.data || [];
    } catch (error) {
      console.error('Apple Music search failed:', error);
      throw new Error('Failed to search songs on Apple Music');
    }
  }

  /**
   * Obtém detalhes de uma música específica
   */
  async getSong(songId: string): Promise<AppleMusicTrack | null> {
    try {
      const developerToken = this.generateDeveloperToken();
      
      const response = await this.apiClient.get(`/catalog/us/songs/${songId}`, {
        headers: {
          Authorization: `Bearer ${developerToken}`
        },
        params: {
          include: 'albums'
        }
      });

      return response.data.data[0] || null;
    } catch (error) {
      console.error('Failed to get Apple Music song:', error);
      return null;
    }
  }

  /**
   * Busca playlists do usuário
   */
  async getUserPlaylists(userToken: string, limit = 20): Promise<AppleMusicPlaylist[]> {
    try {
      const developerToken = this.generateDeveloperToken();
      
      const response = await this.apiClient.get('/me/library/playlists', {
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': userToken
        },
        params: {
          limit,
          offset: 0
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get user playlists:', error);
      throw new Error('Failed to get user playlists from Apple Music');
    }
  }

  /**
   * Cria uma nova playlist
   */
  async createPlaylist(userToken: string, name: string, description?: string): Promise<AppleMusicPlaylist> {
    try {
      const developerToken = this.generateDeveloperToken();
      
      const response = await this.apiClient.post('/me/library/playlists', {
        attributes: {
          name,
          description: description || ''
        }
      }, {
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': userToken,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('Failed to create Apple Music playlist:', error);
      throw new Error('Failed to create playlist on Apple Music');
    }
  }

  /**
   * Adiciona músicas a uma playlist
   */
  async addSongsToPlaylist(userToken: string, playlistId: string, songIds: string[]): Promise<void> {
    try {
      const developerToken = this.generateDeveloperToken();
      
      // Apple Music requer que as músicas sejam adicionadas uma por vez
      for (const songId of songIds) {
        await this.apiClient.post(`/me/library/playlists/${playlistId}/tracks`, {
          data: [{
            id: songId,
            type: 'songs'
          }]
        }, {
          headers: {
            Authorization: `Bearer ${developerToken}`,
            'Music-User-Token': userToken,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Failed to add songs to Apple Music playlist:', error);
      throw new Error('Failed to add songs to playlist on Apple Music');
    }
  }

  /**
   * Obtém perfil do usuário
   */
  async getUserProfile(userToken: string): Promise<any> {
    try {
      const developerToken = this.generateDeveloperToken();
      
      const response = await this.apiClient.get('/me', {
        headers: {
          Authorization: `Bearer ${developerToken}`,
          'Music-User-Token': userToken
        }
      });

      return response.data.data[0];
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('Failed to get user profile from Apple Music');
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Converte música do Apple Music para nosso formato
   */
  convertAppleMusicTrackToSong(track: AppleMusicTrack): Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title: track.attributes.name,
      artist: track.attributes.artistName,
      album: track.attributes.albumName,
      duration: Math.floor(track.attributes.durationInMillis / 1000),
      genre: track.attributes.genreNames[0],
      year: track.attributes.releaseDate ? new Date(track.attributes.releaseDate).getFullYear() : undefined,
      platform: Platform.APPLE,
      platformId: track.id,
      previewUrl: track.attributes.previews?.[0]?.url,
      imageUrl: track.attributes.artwork?.url ? 
        track.attributes.artwork.url.replace('{w}', '300').replace('{h}', '300') : undefined
    };
  }

  /**
   * Simula características de áudio (Apple Music não fornece via API pública)
   */
  generateMockAudioFeatures(track: AppleMusicTrack): AudioFeatures {
    const genre = track.attributes.genreNames[0]?.toLowerCase() || '';
    const title = track.attributes.name.toLowerCase();
    
    // Análise baseada em gênero
    let danceability = 0.5;
    let energy = 0.5;
    let valence = 0.5;
    let tempo = 120;
    let loudness = -6;

    if (genre.includes('pop') || genre.includes('dance')) {
      danceability = 0.8;
      energy = 0.7;
      valence = 0.7;
      tempo = 130;
      loudness = -4;
    } else if (genre.includes('rock') || genre.includes('metal')) {
      danceability = 0.6;
      energy = 0.9;
      valence = 0.6;
      tempo = 140;
      loudness = -2;
    } else if (genre.includes('jazz') || genre.includes('blues')) {
      danceability = 0.4;
      energy = 0.4;
      valence = 0.5;
      tempo = 100;
      loudness = -8;
    } else if (genre.includes('classical')) {
      danceability = 0.3;
      energy = 0.3;
      valence = 0.4;
      tempo = 80;
      loudness = -12;
    } else if (genre.includes('electronic') || genre.includes('edm')) {
      danceability = 0.9;
      energy = 0.8;
      valence = 0.6;
      tempo = 128;
      loudness = -3;
    }

    // Ajustes baseados no título
    if (title.includes('happy') || title.includes('joy')) {
      valence = Math.min(valence + 0.2, 1);
    } else if (title.includes('sad') || title.includes('cry')) {
      valence = Math.max(valence - 0.3, 0);
    }

    return {
      danceability,
      energy,
      valence,
      tempo,
      loudness,
      acousticness: genre.includes('acoustic') ? 0.8 : 0.3,
      instrumentalness: title.includes('instrumental') ? 0.9 : 0.1,
      liveness: 0.1,
      speechiness: 0.1
    };
  }

  /**
   * Gera URL de autorização (Apple Music usa MusicKit)
   */
  generateAuthUrl(): string {
    // Apple Music usa MusicKit JS, não OAuth tradicional
    return 'https://music.apple.com/us/browse';
  }

  /**
   * Valida se o token de usuário é válido
   */
  async validateUserToken(userToken: string): Promise<boolean> {
    try {
      await this.getUserProfile(userToken);
      return true;
    } catch (error) {
      return false;
    }
  }
}
