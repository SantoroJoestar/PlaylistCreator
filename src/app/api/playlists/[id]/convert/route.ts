/**
 * 🔄 Playlist Conversion API Routes
 * 
 * Endpoints para conversão de playlists:
 * - POST /api/playlists/:id/convert - Converter playlist
 * - GET /api/playlists/:id/convert/preview - Preview da conversão
 * - GET /api/conversions - Histórico de conversões
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlaylistConversionService } from '@/services/conversion/PlaylistConversionService';
import { PlaylistService, MusicService } from '@/services';
import { PlaylistRepository, UserRepository, SongRepository } from '@/repositories';
import { prisma } from '@/lib/database';
import { withRequiredAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { Platform } from '@/lib/config/platforms';

// ==================== TYPES ====================

interface ConvertPlaylistRequest {
  targetPlatform: Platform;
}

interface ConversionResponse {
  success: boolean;
  data?: {
    conversion: {
      id: string;
      originalPlaylist: {
        id: string;
        name: string;
        platform: string;
        songCount: number;
      };
      convertedPlaylist?: {
        id: string;
        name: string;
        platform: string;
        songCount: number;
        matchedSongs: number;
        unmatchedSongs: number;
        conversionRate: number;
      };
      errors: Array<{
        songId: string;
        songTitle: string;
        reason: string;
        platform: string;
      }>;
      warnings: string[];
    };
  };
  error?: string;
  timestamp: Date;
}

interface PreviewResponse {
  success: boolean;
  data?: {
    compatibility: {
      score: number;
      estimatedMatches: number;
      potentialIssues: string[];
    };
    songMatches: Array<{
      originalSong: {
        id: string;
        title: string;
        artist: string;
        album?: string;
        duration: number;
      };
      matchedSong?: {
        id: string;
        title: string;
        artist: string;
        album?: string;
        duration: number;
        platform: string;
      };
      confidence: number;
      isExactMatch: boolean;
    }>;
  };
  error?: string;
  timestamp: Date;
}

interface ConversionHistoryResponse {
  success: boolean;
  data?: {
    conversions: Array<{
      id: string;
      originalPlaylist: {
        id: string;
        name: string;
        platform: string;
      };
      targetPlatform: string;
      status: string;
      matchedSongs: number;
      unmatchedSongs: number;
      conversionRate: number;
      createdAt: string;
      completedAt?: string;
    }>;
  };
  error?: string;
  timestamp: Date;
}

// ==================== SERVICE INITIALIZATION ====================

const playlistService = new PlaylistService(
  new PlaylistRepository(prisma),
  new UserRepository(prisma),
  new SongRepository(prisma)
);

const musicService = new MusicService(new SongRepository(prisma));
const conversionService = new PlaylistConversionService(playlistService, musicService);

// ==================== API HANDLERS ====================

/**
 * POST /api/playlists/:id/convert
 * Converte playlist para outra plataforma
 */
export const POST = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }): Promise<NextResponse<ConversionResponse>> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;
    const body: ConvertPlaylistRequest = await request.json();

    if (!body.targetPlatform) {
      return NextResponse.json({
        success: false,
        error: 'Target platform is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    if (!['spotify', 'youtube', 'apple'].includes(body.targetPlatform)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid target platform',
        timestamp: new Date()
      }, { status: 400 });
    }

    console.log(`🔄 Converting playlist ${playlistId} to ${body.targetPlatform}`);

    // Executar conversão
    const result = await conversionService.convertPlaylist(playlistId, body.targetPlatform, userId);

    const response: ConversionResponse = {
      success: result.success,
      data: result.success ? {
        conversion: {
          id: `conversion_${Date.now()}`,
          originalPlaylist: result.originalPlaylist,
          convertedPlaylist: result.convertedPlaylist,
          errors: result.errors,
          warnings: result.warnings
        }
      } : undefined,
      error: result.success ? undefined : result.errors[0]?.reason || 'Conversion failed',
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: result.success ? 201 : 400 });

  } catch (error) {
    console.error('Playlist conversion failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Playlist conversion failed',
      timestamp: new Date()
    }, { status: 500 });
  }
});

/**
 * GET /api/playlists/:id/convert/preview
 * Preview da conversão sem executar
 */
export const GET_PREVIEW = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }): Promise<NextResponse<PreviewResponse>> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;
    const url = new URL(request.url);
    const targetPlatform = url.searchParams.get('platform') as Platform;

    if (!targetPlatform || !['spotify', 'youtube', 'apple'].includes(targetPlatform)) {
      return NextResponse.json({
        success: false,
        error: 'Valid target platform is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    console.log(`🔍 Previewing conversion for playlist ${playlistId} to ${targetPlatform}`);

    // Analisar compatibilidade
    const compatibility = await conversionService.analyzeCompatibility(playlistId, targetPlatform);

    // Preview das músicas
    const songMatches = await conversionService.previewConversion(playlistId, targetPlatform);

    const response: PreviewResponse = {
      success: true,
      data: {
        compatibility: {
          score: compatibility.compatibility,
          estimatedMatches: compatibility.estimatedMatches,
          potentialIssues: compatibility.potentialIssues
        },
        songMatches: songMatches.map(match => ({
          originalSong: {
            id: match.originalSong.id,
            title: match.originalSong.title,
            artist: match.originalSong.artist,
            album: match.originalSong.album || undefined,
            duration: match.originalSong.duration
          },
          matchedSong: match.matchedSong ? {
            id: match.matchedSong.id,
            title: match.matchedSong.title,
            artist: match.matchedSong.artist,
            album: match.matchedSong.album || undefined,
            duration: match.matchedSong.duration,
            platform: match.matchedSong.platform
          } : undefined,
          confidence: match.confidence,
          isExactMatch: match.isExactMatch
        }))
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Conversion preview failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Conversion preview failed',
      timestamp: new Date()
    }, { status: 500 });
  }
});

/**
 * GET /api/conversions
 * Histórico de conversões do usuário
 */
export const GET_HISTORY = withRequiredAuth(async (request: AuthenticatedRequest): Promise<NextResponse<ConversionHistoryResponse>> => {
  try {
    const userId = request.user!.id;

    const conversions = await conversionService.getConversionHistory(userId);

    const response: ConversionHistoryResponse = {
      success: true,
      data: {
        conversions: conversions.map(conversion => ({
          id: conversion.id,
          originalPlaylist: conversion.originalPlaylist,
          targetPlatform: conversion.targetPlatform,
          status: conversion.status,
          matchedSongs: conversion.matchedSongs,
          unmatchedSongs: conversion.unmatchedSongs,
          conversionRate: conversion.conversionRate,
          createdAt: conversion.createdAt.toISOString(),
          completedAt: conversion.completedAt?.toISOString()
        }))
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get conversion history failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversion history',
      timestamp: new Date()
    }, { status: 500 });
  }
});
