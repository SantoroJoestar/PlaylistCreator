/**
 * 🎵 Playlist API Routes
 * 
 * Endpoints para gerenciamento de playlists:
 * - POST /api/playlists - Criar playlist
 * - GET /api/playlists - Listar playlists do usuário
 * - GET /api/playlists/:id - Obter playlist específica
 * - PUT /api/playlists/:id - Atualizar playlist
 * - DELETE /api/playlists/:id - Deletar playlist
 * - POST /api/playlists/:id/songs - Adicionar música
 * - DELETE /api/playlists/:id/songs/:songId - Remover música
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlaylistService, MusicService } from '@/services';
import { PlaylistRepository, UserRepository, SongRepository } from '@/repositories';
import { prisma } from '@/lib/database';
import { withRequiredAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { Platform } from '@/lib/config/platforms';

// ==================== TYPES ====================

interface CreatePlaylistRequest {
  name: string;
  description?: string;
  platform: Platform;
  mood?: string;
  playlistType: string;
  isPublic?: boolean;
  songs?: Array<{
    songId: string;
    position: number;
  }>;
}

interface PlaylistResponse {
  success: boolean;
  data?: {
    playlist: {
      id: string;
      name: string;
      description?: string;
      platform: string;
      mood?: string;
      playlistType: string;
      isPublic: boolean;
      songCount: number;
      duration?: number;
      createdAt: string;
      updatedAt: string;
      songs: Array<{
        id: string;
        title: string;
        artist: string;
        album?: string;
        duration: number;
        position: number;
        addedAt: string;
      }>;
    };
  };
  error?: string;
  timestamp: Date;
}

interface PlaylistsListResponse {
  success: boolean;
  data?: {
    playlists: Array<{
      id: string;
      name: string;
      description?: string;
      platform: string;
      mood?: string;
      playlistType: string;
      isPublic: boolean;
      songCount: number;
      duration?: number;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
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

// ==================== API HANDLERS ====================

/**
 * POST /api/playlists
 * Cria uma nova playlist
 */
export const POST = withRequiredAuth(async (request: AuthenticatedRequest): Promise<NextResponse<PlaylistResponse>> => {
  try {
    const body: CreatePlaylistRequest = await request.json();
    const userId = request.user!.id;

    // Validar dados obrigatórios
    if (!body.name || !body.platform || !body.playlistType) {
      return NextResponse.json({
        success: false,
        error: 'Name, platform, and playlistType are required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Validar plataforma
    if (!['spotify', 'youtube', 'apple'].includes(body.platform)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid platform',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Criar playlist
    const playlist = await playlistService.createPlaylist({
      name: body.name,
      description: body.description,
      platform: body.platform,
      mood: body.mood as any,
      playlistType: body.playlistType as any,
      userId,
      isPublic: body.isPublic || false,
      songs: body.songs?.map(song => ({
        songId: song.songId,
        position: song.position,
        addedBy: userId
      }))
    });

    const response: PlaylistResponse = {
      success: true,
      data: {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || undefined,
          platform: playlist.platform,
          mood: playlist.mood || undefined,
          playlistType: playlist.playlistType,
          isPublic: playlist.isPublic,
          songCount: playlist.songCount,
          duration: playlist.duration || undefined,
          createdAt: playlist.createdAt.toISOString(),
          updatedAt: playlist.updatedAt.toISOString(),
          songs: playlist.songs.map(ps => ({
            id: ps.song.id,
            title: ps.song.title,
            artist: ps.song.artist,
            album: ps.song.album || undefined,
            duration: ps.song.duration,
            position: ps.position,
            addedAt: ps.addedAt.toISOString()
          }))
        }
      },
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Create playlist failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create playlist',
      timestamp: new Date()
    }, { status: 400 });
  }
});

/**
 * GET /api/playlists
 * Lista playlists do usuário
 */
export const GET = withRequiredAuth(async (request: AuthenticatedRequest): Promise<NextResponse<PlaylistsListResponse>> => {
  try {
    const userId = request.user!.id;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Buscar playlists
    const playlists = await playlistService.getUserPlaylists(userId, limit, offset);
    
    // Contar total para paginação
    const totalPlaylists = await prisma.playlist.count({
      where: { userId }
    });

    const response: PlaylistsListResponse = {
      success: true,
      data: {
        playlists: playlists.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description || undefined,
          platform: playlist.platform,
          mood: playlist.mood || undefined,
          playlistType: playlist.playlistType,
          isPublic: playlist.isPublic,
          songCount: playlist.songCount,
          duration: playlist.duration || undefined,
          createdAt: playlist.createdAt.toISOString(),
          updatedAt: playlist.updatedAt.toISOString()
        })),
        pagination: {
          total: totalPlaylists,
          page,
          limit,
          hasMore: offset + limit < totalPlaylists
        }
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get playlists failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get playlists',
      timestamp: new Date()
    }, { status: 500 });
  }
});
