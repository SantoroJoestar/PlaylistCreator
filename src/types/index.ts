/**
 * 🎵 Core Types for Playlist Creator
 * 
 * Aqui definimos todas as interfaces e tipos principais
 * Seguindo princípios SOLID, especialmente Interface Segregation
 */

import { Platform, Mood } from '@/lib/config/platforms';

// ==================== USER TYPES ====================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  defaultPlatform: Platform;
  favoriteGenres: string[];
  moodHistory: Mood[];
  language: string;
  theme: 'light' | 'dark' | 'system';
}

// ==================== PLAYLIST TYPES ====================

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  userId: string;
  platform: Platform;
  mood?: Mood;
  playlistType: PlaylistType;
  isPublic: boolean;
  songCount: number;
  duration?: number; // em segundos
  createdAt: Date;
  updatedAt: Date;
  songs: PlaylistSong[];
  metadata?: PlaylistMetadata;
}

export type PlaylistType = 'mood' | 'genre' | 'activity' | 'personalized' | 'collaborative';

export interface PlaylistMetadata {
  createdBy: 'user' | 'ai' | 'system';
  sourcePlaylistId?: string; // Para playlists convertidas
  conversionRate?: number; // Taxa de conversão
  tags: string[];
  moodScore?: number; // 0-1
  energyLevel?: number; // 0-1
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  platform: Platform;
  mood?: Mood;
  playlistType: PlaylistType;
  isPublic?: boolean;
  songs?: Omit<PlaylistSong, 'id' | 'addedAt'>[];
}

export interface UpdatePlaylistData {
  name?: string;
  description?: string;
  isPublic?: boolean;
  songs?: PlaylistSong[];
}

// ==================== SONG TYPES ====================

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // em segundos
  genre?: string;
  year?: number;
  platform: Platform;
  platformId: string; // ID na plataforma específica
  previewUrl?: string;
  imageUrl?: string;
  audioFeatures?: AudioFeatures;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistSong {
  id: string;
  playlistId: string;
  songId: string;
  position: number;
  addedAt: Date;
  addedBy: string; // userId
  song: Song;
}

export interface AudioFeatures {
  danceability: number; // 0-1
  energy: number; // 0-1
  valence: number; // 0-1 (positividade)
  tempo: number; // BPM
  loudness: number; // dB
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1
  liveness: number; // 0-1
  speechiness: number; // 0-1
}

export interface SearchSongParams {
  query: string;
  platform?: Platform;
  limit?: number;
  offset?: number;
  genre?: string;
  year?: number;
}

// ==================== MOOD ANALYSIS TYPES ====================

export interface MoodAnalysis {
  id: string;
  userId: string;
  primaryMood: Mood;
  confidence: number; // 0-1
  secondaryMoods: Mood[];
  questionnaireResponses: QuestionnaireResponse[];
  recommendedGenres: string[];
  playlistSuggestions: PlaylistSuggestion[];
  createdAt: Date;
}

export interface QuestionnaireResponse {
  question: string;
  answer: string | number;
  weight: number; // 0-1, importância da resposta
}

export interface PlaylistSuggestion {
  name: string;
  description: string;
  estimatedDuration: number; // em minutos
  mood: Mood;
  genres: string[];
  songCount: number;
}

// ==================== INTEGRATION TYPES ====================

export interface PlatformIntegration {
  platform: Platform;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  isActive: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
  userProfile?: PlatformUserProfile;
}

export interface PlatformUserProfile {
  platformId: string;
  displayName: string;
  email?: string;
  avatar?: string;
  followers?: number;
  playlists?: number;
  country?: string;
}

// ==================== CONVERSION TYPES ====================

export interface PlaylistConversion {
  id: string;
  originalPlaylistId: string;
  targetPlatform: Platform;
  convertedPlaylistId?: string;
  status: ConversionStatus;
  matchedSongs: number;
  unmatchedSongs: number;
  conversionRate: number; // 0-1
  errors: ConversionError[];
  createdAt: Date;
  completedAt?: Date;
}

export type ConversionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ConversionError {
  songId: string;
  songTitle: string;
  reason: string;
  suggestion?: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== FORM TYPES ====================

export interface PlaylistFormData {
  name: string;
  description?: string;
  platform: Platform;
  mood?: Mood;
  playlistType: PlaylistType;
  isPublic: boolean;
}

export interface MoodQuestionnaireData {
  currentMood: Mood;
  energyLevel: number; // 1-10
  activity: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  socialSituation: 'alone' | 'friends' | 'family' | 'partner';
  musicPreference: string[];
}

// ==================== ERROR TYPES ====================

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'PLATFORM_ERROR'
  | 'CONVERSION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR';

// ==================== UTILITY TYPES ====================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// ==================== ENUMS ====================

export enum PlaylistVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum SortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SONG_COUNT = 'songCount',
  DURATION = 'duration'
}
