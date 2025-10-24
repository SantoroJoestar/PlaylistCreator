/**
 * 🗄️ Repository Pattern Implementation
 * 
 * Repository Pattern nos permite:
 * - Abstrair acesso a dados
 * - Facilitar testes (mocks)
 * - Seguir Dependency Inversion Principle
 * - Centralizar lógica de persistência
 */

import { PrismaClient } from '@prisma/client';
import { 
  User, 
  Playlist, 
  Song, 
  PlaylistSong, 
  CreatePlaylistData, 
  UpdatePlaylistData,
  PlatformIntegration,
  MoodAnalysis,
  PlaylistConversion
} from '@/types';

// ==================== BASE REPOSITORY ====================

/**
 * Interface base para todos os repositórios
 * Define operações CRUD básicas
 */
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  findAll(limit?: number, offset?: number): Promise<T[]>;
}

// ==================== USER REPOSITORY ====================

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  updatePreferences(userId: string, preferences: any): Promise<User>;
}

export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePreferences(userId: string, preferences: any): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { preferences }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findAll(limit = 50, offset = 0): Promise<User[]> {
    return this.prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }
}

// ==================== PLAYLIST REPOSITORY ====================

export interface IPlaylistRepository extends IBaseRepository<Playlist> {
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Playlist[]>;
  findByPlatform(platform: string, limit?: number, offset?: number): Promise<Playlist[]>;
  findByMood(mood: string, limit?: number, offset?: number): Promise<Playlist[]>;
  findPublicPlaylists(limit?: number, offset?: number): Promise<Playlist[]>;
  addSong(playlistId: string, songId: string, position?: number): Promise<PlaylistSong>;
  removeSong(playlistId: string, songId: string): Promise<void>;
  reorderSongs(playlistId: string, songIds: string[]): Promise<void>;
}

export class PlaylistRepository implements IPlaylistRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Playlist | null> {
    return this.prisma.playlist.findUnique({
      where: { id },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      }
    });
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByPlatform(platform: string, limit = 50, offset = 0): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { platform },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByMood(mood: string, limit = 50, offset = 0): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { mood },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findPublicPlaylists(limit = 50, offset = 0): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      where: { isPublic: true },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: CreatePlaylistData): Promise<Playlist> {
    return this.prisma.playlist.create({
      data: {
        ...data,
        songs: {
          create: data.songs?.map((song, index) => ({
            songId: song.songId,
            position: index,
            addedBy: data.userId || ''
          })) || []
        }
      },
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      }
    });
  }

  async update(id: string, data: UpdatePlaylistData): Promise<Playlist> {
    return this.prisma.playlist.update({
      where: { id },
      data,
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.playlist.delete({ where: { id } });
  }

  async findAll(limit = 50, offset = 0): Promise<Playlist[]> {
    return this.prisma.playlist.findMany({
      include: {
        songs: {
          include: { song: true },
          orderBy: { position: 'asc' }
        }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async addSong(playlistId: string, songId: string, position?: number): Promise<PlaylistSong> {
    // Se não especificou posição, adiciona no final
    if (position === undefined) {
      const lastSong = await this.prisma.playlistSong.findFirst({
        where: { playlistId },
        orderBy: { position: 'desc' }
      });
      position = lastSong ? lastSong.position + 1 : 0;
    }

    return this.prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        position,
        addedBy: '' // Será preenchido pelo service
      },
      include: { song: true }
    });
  }

  async removeSong(playlistId: string, songId: string): Promise<void> {
    await this.prisma.playlistSong.deleteMany({
      where: { playlistId, songId }
    });
  }

  async reorderSongs(playlistId: string, songIds: string[]): Promise<void> {
    // Atualiza posições de todas as músicas
    await Promise.all(
      songIds.map((songId, index) =>
        this.prisma.playlistSong.updateMany({
          where: { playlistId, songId },
          data: { position: index }
        })
      )
    );
  }
}

// ==================== SONG REPOSITORY ====================

export interface ISongRepository extends IBaseRepository<Song> {
  findByPlatform(platform: string, limit?: number, offset?: number): Promise<Song[]>;
  findByGenre(genre: string, limit?: number, offset?: number): Promise<Song[]>;
  findByArtist(artist: string, limit?: number, offset?: number): Promise<Song[]>;
  search(query: string, limit?: number, offset?: number): Promise<Song[]>;
  findByPlatformId(platform: string, platformId: string): Promise<Song | null>;
}

export class SongRepository implements ISongRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Song | null> {
    return this.prisma.song.findUnique({ where: { id } });
  }

  async findByPlatform(platform: string, limit = 50, offset = 0): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: { platform },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByGenre(genre: string, limit = 50, offset = 0): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: { genre },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByArtist(artist: string, limit = 50, offset = 0): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: { artist: { contains: artist, mode: 'insensitive' } },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async search(query: string, limit = 50, offset = 0): Promise<Song[]> {
    return this.prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { contains: query, mode: 'insensitive' } },
          { album: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByPlatformId(platform: string, platformId: string): Promise<Song | null> {
    return this.prisma.song.findFirst({
      where: { platform, platformId }
    });
  }

  async create(data: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Promise<Song> {
    return this.prisma.song.create({ data });
  }

  async update(id: string, data: Partial<Song>): Promise<Song> {
    return this.prisma.song.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.song.delete({ where: { id } });
  }

  async findAll(limit = 50, offset = 0): Promise<Song[]> {
    return this.prisma.song.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }
}

// ==================== INTEGRATION REPOSITORY ====================

export interface IIntegrationRepository {
  findByUserId(userId: string): Promise<PlatformIntegration[]>;
  findByPlatform(userId: string, platform: string): Promise<PlatformIntegration | null>;
  create(data: Omit<PlatformIntegration, 'id' | 'connectedAt'>): Promise<PlatformIntegration>;
  update(id: string, data: Partial<PlatformIntegration>): Promise<PlatformIntegration>;
  delete(id: string): Promise<void>;
  updateLastSync(userId: string, platform: string): Promise<void>;
}

export class IntegrationRepository implements IIntegrationRepository {
  constructor(private prisma: PrismaClient) {}

  async findByUserId(userId: string): Promise<PlatformIntegration[]> {
    return this.prisma.platformIntegration.findMany({
      where: { userId }
    });
  }

  async findByPlatform(userId: string, platform: string): Promise<PlatformIntegration | null> {
    return this.prisma.platformIntegration.findFirst({
      where: { userId, platform }
    });
  }

  async create(data: Omit<PlatformIntegration, 'id' | 'connectedAt'>): Promise<PlatformIntegration> {
    return this.prisma.platformIntegration.create({
      data: {
        ...data,
        connectedAt: new Date()
      }
    });
  }

  async update(id: string, data: Partial<PlatformIntegration>): Promise<PlatformIntegration> {
    return this.prisma.platformIntegration.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.platformIntegration.delete({ where: { id } });
  }

  async updateLastSync(userId: string, platform: string): Promise<void> {
    await this.prisma.platformIntegration.updateMany({
      where: { userId, platform },
      data: { lastSyncAt: new Date() }
    });
  }
}
