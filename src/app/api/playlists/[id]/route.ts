/**
 * 🎵 Individual Playlist API Routes
 * 
 * Endpoints para operações em playlists específicas:
 * - GET /api/playlists/:id - Obter playlist específica
 * - PUT /api/playlists/:id - Atualizar playlist
 * - DELETE /api/playlists/:id - Deletar playlist
 * - POST /api/playlists/:id/songs - Adicionar música
 * - DELETE /api/playlists/:id/songs/:songId - Remover música
 * - PUT /api/playlists/:id/reorder - Reordenar músicas
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlaylistService, MusicService } from '@/services';
import { PlaylistRepository, UserRepository, SongRepository } from '@/repositories';
import { prisma } from '@/lib/database';
import { withRequiredAuth, AuthenticatedRequest } from '@/lib/auth/middleware';

// ==================== TYPES ====================

interface UpdatePlaylistRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

interface AddSongRequest {
  songId: string;
  position?: number;
}

interface ReorderSongsRequest {
  songIds: string[];
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

// ==================== SERVICE INITIALIZATION ====================

const playlistService = new PlaylistService(
  new PlaylistRepository(prisma),
  new UserRepository(prisma),
  new SongRepository(prisma)
);

const musicService = new MusicService(new SongRepository(prisma));

// ==================== API HANDLERS ====================

/**
 * GET /api/playlists/:id
 * Obtém uma playlist específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<PlaylistResponse>> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.substring(7);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required',
        timestamp: new Date()
      }, { status: 401 });
    }

    // Validar token e obter usuário
    const user = await playlistService['validateToken'](token);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date()
      }, { status: 401 });
    }

    const playlistId = params.id;
    const playlist = await playlistService.getPlaylistById(playlistId, user.id);

    if (!playlist) {
      return NextResponse.json({
        success: false,
        error: 'Playlist not found',
        timestamp: new Date()
      }, { status: 404 });
    }

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

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get playlist failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get playlist',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * PUT /api/playlists/:id
 * Atualiza uma playlist
 */
export const PUT = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }): Promise<NextResponse<PlaylistResponse>> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;
    const body: UpdatePlaylistRequest = await request.json();

    // Atualizar playlist
    const playlist = await playlistService.updatePlaylist(playlistId, body, userId);

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

    return NextResponse.json(response);

  } catch (error) {
    console.error('Update playlist failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update playlist',
      timestamp: new Date()
    }, { status: 400 });
  }
});

/**
 * DELETE /api/playlists/:id
 * Deleta uma playlist
 */
export const DELETE = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }): Promise<NextResponse> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;

    await playlistService.deletePlaylist(playlistId, userId);

    return NextResponse.json({
      success: true,
      data: { message: 'Playlist deleted successfully' },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Delete playlist failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete playlist',
      timestamp: new Date()
    }, { status: 400 });
  }
});

/**
 * POST /api/playlists/:id/songs
 * Adiciona uma música à playlist
 */
export const POST = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }): Promise<NextResponse> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;
    const body: AddSongRequest = await request.json();

    if (!body.songId) {
      return NextResponse.json({
        success: false,
        error: 'Song ID is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    await playlistService.addSongToPlaylist(playlistId, body.songId, userId);

    return NextResponse.json({
      success: true,
      data: { message: 'Song added to playlist successfully' },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Add song to playlist failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add song to playlist',
      timestamp: new Date()
    }, { status: 400 });
  }
});

/**
 * DELETE /api/playlists/:id/songs/:songId
 * Remove uma música da playlist
 */
export const DELETE_SONG = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string; songId: string } }): Promise<NextResponse> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;
    const songId = params.songId;

    await playlistService.removeSongFromPlaylist(playlistId, songId, userId);

    return NextResponse.json({
      success: true,
      data: { message: 'Song removed from playlist successfully' },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Remove song from playlist failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove song from playlist',
      timestamp: new Date()
    }, { status: 400 });
  }
});

/**
 * PUT /api/playlists/:id/reorder
 * Reordena músicas da playlist
 */
export const REORDER = withRequiredAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }): Promise<NextResponse> => {
  try {
    const userId = request.user!.id;
    const playlistId = params.id;
    const body: ReorderSongsRequest = await request.json();

    if (!body.songIds || !Array.isArray(body.songIds)) {
      return NextResponse.json({
        success: false,
        error: 'Song IDs array is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    await playlistService.reorderPlaylistSongs(playlistId, body.songIds, userId);

    return NextResponse.json({
      success: true,
      data: { message: 'Playlist songs reordered successfully' },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Reorder playlist songs failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder playlist songs',
      timestamp: new Date()
    }, { status: 400 });
  }
});
