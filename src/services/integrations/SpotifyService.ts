/**
 * 🎵 Spotify Integration Service
 * 
 * Implementa integração com Spotify Web API:
 * - Autenticação OAuth 2.0
 * - Busca de músicas e playlists
 * - Criação e gerenciamento de playlists
 * - Análise de características de áudio
 */

import axios, { AxiosInstance } from 'axios';
import { Platform, Song, AudioFeatures, Playlist } from '@/types';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
    release_date: string;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: {
    total: number;
    items: Array<{ track: SpotifyTrack }>;
  };
  images: Array<{ url: string }>;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  loudness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
}

export interface ISpotifyService {
  authenticate(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;
  searchTracks(query: string, limit?: number): Promise<SpotifyTrack[]>;
  getTrack(trackId: string): Promise<SpotifyTrack | null>;
  getTrackAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null>;
  getUserPlaylists(accessToken: string, limit?: number): Promise<SpotifyPlaylist[]>;
  createPlaylist(accessToken: string, userId: string, name: string, description?: string): Promise<SpotifyPlaylist>;
  addTracksToPlaylist(accessToken: string, playlistId: string, trackIds: string[]): Promise<void>;
  getUserProfile(accessToken: string): Promise<any>;
}

export class SpotifyService implements ISpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiClient: AxiosInstance;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
    
    this.apiClient = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Interceptor para adicionar token automaticamente
    this.apiClient.interceptors.request.use((config) => {
      const token = config.headers.Authorization?.replace('Bearer ', '');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Autentica usuário e obtém tokens
   */
  async authenticate(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('Spotify authentication failed:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  /**
   * Renova token de acesso
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('Spotify token refresh failed:', error);
      throw new Error('Failed to refresh Spotify token');
    }
  }

  /**
   * Busca músicas no Spotify
   */
  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    try {
      const response = await this.apiClient.get('/search', {
        params: {
          q: query,
          type: 'track',
          limit,
          market: 'BR'
        }
      });

      return response.data.tracks.items;
    } catch (error) {
      console.error('Spotify search failed:', error);
      throw new Error('Failed to search tracks on Spotify');
    }
  }

  /**
   * Obtém detalhes de uma música específica
   */
  async getTrack(trackId: string): Promise<SpotifyTrack | null> {
    try {
      const response = await this.apiClient.get(`/tracks/${trackId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get Spotify track:', error);
      return null;
    }
  }

  /**
   * Obtém características de áudio de uma música
   */
  async getTrackAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null> {
    try {
      const response = await this.apiClient.get(`/audio-features/${trackId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get Spotify audio features:', error);
      return null;
    }
  }

  /**
   * Busca playlists do usuário
   */
  async getUserPlaylists(accessToken: string, limit = 20): Promise<SpotifyPlaylist[]> {
    try {
      const response = await this.apiClient.get('/me/playlists', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          limit,
          market: 'BR'
        }
      });

      return response.data.items;
    } catch (error) {
      console.error('Failed to get user playlists:', error);
      throw new Error('Failed to get user playlists from Spotify');
    }
  }

  /**
   * Cria uma nova playlist
   */
  async createPlaylist(accessToken: string, userId: string, name: string, description?: string): Promise<SpotifyPlaylist> {
    try {
      const response = await this.apiClient.post(`/users/${userId}/playlists`, {
        name,
        description: description || '',
        public: false
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create Spotify playlist:', error);
      throw new Error('Failed to create playlist on Spotify');
    }
  }

  /**
   * Adiciona músicas a uma playlist
   */
  async addTracksToPlaylist(accessToken: string, playlistId: string, trackIds: string[]): Promise<void> {
    try {
      // Spotify permite até 100 músicas por requisição
      const chunks = this.chunkArray(trackIds, 100);
      
      for (const chunk of chunks) {
        await this.apiClient.post(`/playlists/${playlistId}/tracks`, {
          uris: chunk.map(id => `spotify:track:${id}`)
        }, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Failed to add tracks to Spotify playlist:', error);
      throw new Error('Failed to add tracks to playlist on Spotify');
    }
  }

  /**
   * Obtém perfil do usuário
   */
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await this.apiClient.get('/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('Failed to get user profile from Spotify');
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Converte música do Spotify para nosso formato
   */
  convertSpotifyTrackToSong(track: SpotifyTrack): Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album.name,
      duration: Math.floor(track.duration_ms / 1000),
      genre: undefined, // Spotify não fornece gênero diretamente
      year: track.album.release_date ? new Date(track.album.release_date).getFullYear() : undefined,
      platform: Platform.SPOTIFY,
      platformId: track.id,
      previewUrl: track.preview_url,
      imageUrl: track.album.images[0]?.url
    };
  }

  /**
   * Converte características de áudio do Spotify para nosso formato
   */
  convertSpotifyAudioFeaturesToAudioFeatures(features: SpotifyAudioFeatures): AudioFeatures {
    return {
      danceability: features.danceability,
      energy: features.energy,
      valence: features.valence,
      tempo: features.tempo,
      loudness: features.loudness,
      acousticness: features.acousticness,
      instrumentalness: features.instrumentalness,
      liveness: features.liveness,
      speechiness: features.speechiness
    };
  }

  /**
   * Divide array em chunks menores
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Gera URL de autorização
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-library-read',
        'user-library-modify',
        'user-top-read',
        'user-read-recently-played'
      ].join(' '),
      redirect_uri: this.redirectUri,
      ...(state && { state })
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }
}
