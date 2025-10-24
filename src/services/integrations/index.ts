/**
 * 🎵 Platform Integrations Index
 * 
 * Centraliza todas as integrações com plataformas de música
 * Facilita importação e uso dos serviços
 */

// Spotify Integration
export { 
  ISpotifyService, 
  SpotifyService,
  SpotifyTrack,
  SpotifyPlaylist,
  SpotifyAudioFeatures
} from './SpotifyService';

// YouTube Music Integration
export { 
  IYouTubeService, 
  YouTubeService,
  YouTubeVideo,
  YouTubePlaylist,
  YouTubeSearchResult
} from './YouTubeService';

// Apple Music Integration
export { 
  IAppleMusicService, 
  AppleMusicService,
  AppleMusicTrack,
  AppleMusicPlaylist,
  AppleMusicSearchResult
} from './AppleMusicService';

// Base interface for all platform services
export interface IPlatformService {
  authenticate(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;
  searchMusic(query: string, limit?: number): Promise<any[]>;
  getUserPlaylists(accessToken: string, limit?: number): Promise<any[]>;
  createPlaylist(accessToken: string, name: string, description?: string): Promise<any>;
  addTracksToPlaylist(accessToken: string, playlistId: string, trackIds: string[]): Promise<void>;
  getUserProfile(accessToken: string): Promise<any>;
}
