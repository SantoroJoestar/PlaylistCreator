/**
 * 🎵 YouTube Music Integration Service
 * 
 * Implementa integração com YouTube Data API v3:
 * - Autenticação OAuth 2.0
 * - Busca de músicas e vídeos
 * - Criação de playlists
 * - Análise de metadados
 */

import axios, { AxiosInstance } from 'axios';
import { Platform, Song, AudioFeatures } from '@/types';

export interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    publishedAt: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 format (PT4M13S)
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
  };
}

export interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    publishedAt: string;
  };
  contentDetails: {
    itemCount: number;
  };
}

export interface YouTubeSearchResult {
  items: Array<{
    id: {
      videoId: string;
      playlistId?: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      description: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
      publishedAt: string;
    };
  }>;
}

export interface IYouTubeService {
  authenticate(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;
  searchVideos(query: string, limit?: number): Promise<YouTubeVideo[]>;
  getVideo(videoId: string): Promise<YouTubeVideo | null>;
  getUserPlaylists(accessToken: string, limit?: number): Promise<YouTubePlaylist[]>;
  createPlaylist(accessToken: string, title: string, description?: string): Promise<YouTubePlaylist>;
  addVideoToPlaylist(accessToken: string, playlistId: string, videoId: string): Promise<void>;
  getUserProfile(accessToken: string): Promise<any>;
}

export class YouTubeService implements IYouTubeService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private apiClient: AxiosInstance;

  constructor() {
    this.clientId = process.env.YOUTUBE_CLIENT_ID || '';
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/api/auth/youtube/callback';
    
    this.apiClient = axios.create({
      baseURL: 'https://www.googleapis.com/youtube/v3',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Autentica usuário e obtém tokens
   */
  async authenticate(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('YouTube authentication failed:', error);
      throw new Error('Failed to authenticate with YouTube');
    }
  }

  /**
   * Renova token de acesso
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('YouTube token refresh failed:', error);
      throw new Error('Failed to refresh YouTube token');
    }
  }

  /**
   * Busca vídeos no YouTube
   */
  async searchVideos(query: string, limit = 20): Promise<YouTubeVideo[]> {
    try {
      const response = await this.apiClient.get('/search', {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: limit,
          order: 'relevance',
          regionCode: 'BR',
          relevanceLanguage: 'pt'
        }
      });

      const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');
      
      // Buscar detalhes completos dos vídeos
      const detailsResponse = await this.apiClient.get('/videos', {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoIds
        }
      });

      return detailsResponse.data.items;
    } catch (error) {
      console.error('YouTube search failed:', error);
      throw new Error('Failed to search videos on YouTube');
    }
  }

  /**
   * Obtém detalhes de um vídeo específico
   */
  async getVideo(videoId: string): Promise<YouTubeVideo | null> {
    try {
      const response = await this.apiClient.get('/videos', {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoId
        }
      });

      return response.data.items[0] || null;
    } catch (error) {
      console.error('Failed to get YouTube video:', error);
      return null;
    }
  }

  /**
   * Busca playlists do usuário
   */
  async getUserPlaylists(accessToken: string, limit = 20): Promise<YouTubePlaylist[]> {
    try {
      const response = await this.apiClient.get('/playlists', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          part: 'snippet,contentDetails',
          mine: true,
          maxResults: limit
        }
      });

      return response.data.items;
    } catch (error) {
      console.error('Failed to get user playlists:', error);
      throw new Error('Failed to get user playlists from YouTube');
    }
  }

  /**
   * Cria uma nova playlist
   */
  async createPlaylist(accessToken: string, title: string, description?: string): Promise<YouTubePlaylist> {
    try {
      const response = await this.apiClient.post('/playlists', {
        snippet: {
          title,
          description: description || ''
        },
        status: {
          privacyStatus: 'private'
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          part: 'snippet,status'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create YouTube playlist:', error);
      throw new Error('Failed to create playlist on YouTube');
    }
  }

  /**
   * Adiciona vídeo a uma playlist
   */
  async addVideoToPlaylist(accessToken: string, playlistId: string, videoId: string): Promise<void> {
    try {
      await this.apiClient.post('/playlistItems', {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId
          }
        }
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          part: 'snippet'
        }
      });
    } catch (error) {
      console.error('Failed to add video to YouTube playlist:', error);
      throw new Error('Failed to add video to playlist on YouTube');
    }
  }

  /**
   * Obtém perfil do usuário
   */
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await this.apiClient.get('/channels', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          part: 'snippet,statistics',
          mine: true
        }
      });

      return response.data.items[0];
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw new Error('Failed to get user profile from YouTube');
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Converte vídeo do YouTube para nosso formato de música
   */
  convertYouTubeVideoToSong(video: YouTubeVideo): Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title: this.extractSongTitle(video.snippet.title),
      artist: video.snippet.channelTitle,
      album: undefined, // YouTube não tem conceito de álbum
      duration: this.parseDuration(video.contentDetails.duration),
      genre: this.extractGenreFromDescription(video.snippet.description),
      year: new Date(video.snippet.publishedAt).getFullYear(),
      platform: Platform.YOUTUBE,
      platformId: video.id,
      previewUrl: undefined, // YouTube não fornece preview
      imageUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url
    };
  }

  /**
   * Extrai título da música do título do vídeo
   */
  private extractSongTitle(videoTitle: string): string {
    // Remove informações extras comuns no YouTube
    const cleanTitle = videoTitle
      .replace(/\s*\(Official Video\)/gi, '')
      .replace(/\s*\(Official Music Video\)/gi, '')
      .replace(/\s*\[Official Video\]/gi, '')
      .replace(/\s*\(Lyrics\)/gi, '')
      .replace(/\s*\[Lyrics\]/gi, '')
      .replace(/\s*\(Audio\)/gi, '')
      .replace(/\s*\[Audio\]/gi, '')
      .trim();

    return cleanTitle;
  }

  /**
   * Converte duração ISO 8601 para segundos
   */
  private parseDuration(duration: string): number {
    // PT4M13S -> 253 segundos
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Extrai gênero da descrição do vídeo
   */
  private extractGenreFromDescription(description: string): string | undefined {
    const genreKeywords = [
      'pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'rap',
      'country', 'blues', 'reggae', 'funk', 'soul', 'r&b', 'metal',
      'indie', 'alternative', 'folk', 'gospel', 'latin', 'world'
    ];

    const lowerDescription = description.toLowerCase();
    for (const genre of genreKeywords) {
      if (lowerDescription.includes(genre)) {
        return genre;
      }
    }

    return undefined;
  }

  /**
   * Gera URL de autorização
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtubepartner'
      ].join(' '),
      redirect_uri: this.redirectUri,
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
  }

  /**
   * Simula características de áudio (YouTube não fornece)
   */
  generateMockAudioFeatures(video: YouTubeVideo): AudioFeatures {
    // Análise básica baseada no título e descrição
    const title = video.snippet.title.toLowerCase();
    const description = video.snippet.description.toLowerCase();
    const text = `${title} ${description}`;

    // Análise simples de características
    const isEnergetic = text.includes('energetic') || text.includes('upbeat') || text.includes('dance');
    const isCalm = text.includes('calm') || text.includes('relax') || text.includes('peaceful');
    const isHappy = text.includes('happy') || text.includes('joy') || text.includes('fun');

    return {
      danceability: isEnergetic ? 0.8 : isCalm ? 0.3 : 0.5,
      energy: isEnergetic ? 0.9 : isCalm ? 0.2 : 0.6,
      valence: isHappy ? 0.8 : isCalm ? 0.4 : 0.5,
      tempo: isEnergetic ? 140 : isCalm ? 80 : 120,
      loudness: isEnergetic ? -3 : isCalm ? -12 : -6,
      acousticness: isCalm ? 0.8 : 0.3,
      instrumentalness: text.includes('instrumental') ? 0.9 : 0.1,
      liveness: 0.1,
      speechiness: text.includes('speech') || text.includes('talk') ? 0.8 : 0.1
    };
  }
}
