/**
 * 🎵 Platform Configuration Object Literal
 * 
 * Este é um exemplo perfeito de Object Literal Pattern:
 * - Configuração centralizada
 * - Fácil de manter e estender
 * - Type-safe com TypeScript
 * - Segue princípio DRY (Don't Repeat Yourself)
 */

export type Platform = 'spotify' | 'youtube' | 'apple';

export interface PlatformConfig {
  name: string;
  color: string;
  apiUrl: string;
  scopes: string[];
  authUrl: string;
  features: {
    createPlaylist: boolean;
    searchMusic: boolean;
    getUserPlaylists: boolean;
    convertPlaylist: boolean;
  };
}

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  spotify: {
    name: 'Spotify',
    color: '#1DB954',
    apiUrl: 'https://api.spotify.com/v1',
    scopes: [
      'playlist-modify-public',
      'playlist-modify-private',
      'playlist-read-private',
      'user-read-private',
      'user-read-email'
    ],
    authUrl: 'https://accounts.spotify.com/authorize',
    features: {
      createPlaylist: true,
      searchMusic: true,
      getUserPlaylists: true,
      convertPlaylist: true
    }
  },
  youtube: {
    name: 'YouTube Music',
    color: '#FF0000',
    apiUrl: 'https://www.googleapis.com/youtube/v3',
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    features: {
      createPlaylist: true,
      searchMusic: true,
      getUserPlaylists: true,
      convertPlaylist: true
    }
  },
  apple: {
    name: 'Apple Music',
    color: '#FA243C',
    apiUrl: 'https://api.music.apple.com/v1',
    scopes: ['user-read-email'],
    authUrl: 'https://appleid.apple.com/auth/authorize',
    features: {
      createPlaylist: false, // Apple Music API é mais restritiva
      searchMusic: true,
      getUserPlaylists: true,
      convertPlaylist: false
    }
  }
} as const;

/**
 * 🎨 Mood Configuration Object Literal
 * 
 * Configuração para análise de humor e personalidade
 */
export type Mood = 'happy' | 'sad' | 'energetic' | 'calm' | 'romantic' | 'focused';

export interface MoodConfig {
  name: string;
  emoji: string;
  color: string;
  genres: string[];
  tempo: {
    min: number;
    max: number;
  };
  energy: {
    min: number;
    max: number;
  };
}

export const MOOD_CONFIG: Record<Mood, MoodConfig> = {
  happy: {
    name: 'Feliz',
    emoji: '😊',
    color: '#FFD700',
    genres: ['pop', 'funk', 'disco', 'reggae'],
    tempo: { min: 120, max: 140 },
    energy: { min: 0.7, max: 1.0 }
  },
  sad: {
    name: 'Triste',
    emoji: '😢',
    color: '#4169E1',
    genres: ['blues', 'soul', 'indie', 'folk'],
    tempo: { min: 60, max: 100 },
    energy: { min: 0.0, max: 0.4 }
  },
  energetic: {
    name: 'Energético',
    emoji: '⚡',
    color: '#FF4500',
    genres: ['rock', 'electronic', 'hip-hop', 'metal'],
    tempo: { min: 130, max: 180 },
    energy: { min: 0.8, max: 1.0 }
  },
  calm: {
    name: 'Calmo',
    emoji: '😌',
    color: '#32CD32',
    genres: ['ambient', 'classical', 'jazz', 'acoustic'],
    tempo: { min: 60, max: 90 },
    energy: { min: 0.0, max: 0.3 }
  },
  romantic: {
    name: 'Romântico',
    emoji: '💕',
    color: '#FF69B4',
    genres: ['r&b', 'soul', 'pop', 'jazz'],
    tempo: { min: 70, max: 110 },
    energy: { min: 0.2, max: 0.6 }
  },
  focused: {
    name: 'Focado',
    emoji: '🎯',
    color: '#9370DB',
    genres: ['ambient', 'electronic', 'classical', 'instrumental'],
    tempo: { min: 80, max: 120 },
    energy: { min: 0.1, max: 0.5 }
  }
} as const;

/**
 * 🔧 App Configuration Object Literal
 * 
 * Configurações gerais da aplicação
 */
export const APP_CONFIG = {
  name: 'Playlist Creator',
  version: '1.0.0',
  description: 'Intelligent playlist creator with multi-platform integration',
  
  // URLs
  urls: {
    base: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    api: '/api',
    auth: '/auth',
    dashboard: '/dashboard'
  },
  
  // Features flags
  features: {
    enableSpotify: true,
    enableYouTube: true,
    enableApple: false, // Desabilitado por enquanto
    enableMoodAnalysis: true,
    enablePlaylistConversion: true,
    enableCollaboration: false // Futura feature
  },
  
  // Limits
  limits: {
    maxPlaylistsPerUser: 50,
    maxSongsPerPlaylist: 100,
    maxPlaylistNameLength: 100,
    maxPlaylistDescriptionLength: 500
  },
  
  // Cache
  cache: {
    playlistTtl: 300, // 5 minutos
    userTtl: 600, // 10 minutos
    musicSearchTtl: 60 // 1 minuto
  }
} as const;

/**
 * 🎵 Music Configuration Object Literal
 * 
 * Configurações relacionadas a música e playlists
 */
export const MUSIC_CONFIG = {
  genres: [
    'pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical',
    'country', 'r&b', 'reggae', 'blues', 'folk', 'metal',
    'indie', 'funk', 'disco', 'soul', 'ambient', 'acoustic'
  ],
  
  audioFeatures: {
    danceability: { min: 0, max: 1 },
    energy: { min: 0, max: 1 },
    valence: { min: 0, max: 1 },
    tempo: { min: 50, max: 200 },
    loudness: { min: -60, max: 0 },
    acousticness: { min: 0, max: 1 },
    instrumentalness: { min: 0, max: 1 },
    liveness: { min: 0, max: 1 },
    speechiness: { min: 0, max: 1 }
  },
  
  playlistTypes: {
    mood: 'Baseada em humor',
    genre: 'Baseada em gênero',
    activity: 'Baseada em atividade',
    personalized: 'Personalizada',
    collaborative: 'Colaborativa'
  }
} as const;
