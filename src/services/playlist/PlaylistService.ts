/**
 * 🎵 Playlist Service - Model Layer
 * 
 * Este service implementa a lógica de negócio para playlists:
 * - Validação de dados
 * - Orquestração de operações
 * - Aplicação de regras de negócio
 * - Segue Single Responsibility Principle
 */

import { 
  Playlist, 
  CreatePlaylistData, 
  UpdatePlaylistData, 
  PlaylistSong,
  Platform,
  Mood 
} from '@/types';
import { IPlaylistRepository, IUserRepository, ISongRepository } from '@/repositories';
import { PLATFORM_CONFIG, MOOD_CONFIG } from '@/lib/config/platforms';

export interface IPlaylistService {
  createPlaylist(data: CreatePlaylistData): Promise<Playlist>;
  getUserPlaylists(userId: string, limit?: number, offset?: number): Promise<Playlist[]>;
  getPlaylistById(id: string, userId: string): Promise<Playlist | null>;
  updatePlaylist(id: string, data: UpdatePlaylistData, userId: string): Promise<Playlist>;
  deletePlaylist(id: string, userId: string): Promise<void>;
  addSongToPlaylist(playlistId: string, songId: string, userId: string): Promise<void>;
  removeSongFromPlaylist(playlistId: string, songId: string, userId: string): Promise<void>;
  reorderPlaylistSongs(playlistId: string, songIds: string[], userId: string): Promise<void>;
  generatePlaylistByMood(mood: Mood, userId: string, platform: Platform): Promise<Playlist>;
}

export class PlaylistService implements IPlaylistService {
  constructor(
    private playlistRepository: IPlaylistRepository,
    private userRepository: IUserRepository,
    private songRepository: ISongRepository
  ) {}

  /**
   * Cria uma nova playlist
   * Aplica validações e regras de negócio
   */
  async createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
    // Validações de negócio
    await this.validatePlaylistData(data);
    
    // Verificar se o usuário existe
    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verificar limite de playlists por usuário
    const userPlaylists = await this.playlistRepository.findByUserId(data.userId);
    if (userPlaylists.length >= 50) { // Limite configurável
      throw new Error('Maximum number of playlists reached');
    }

    // Validar plataforma
    if (!PLATFORM_CONFIG[data.platform]) {
      throw new Error(`Unsupported platform: ${data.platform}`);
    }

    // Validar humor se fornecido
    if (data.mood && !MOOD_CONFIG[data.mood]) {
      throw new Error(`Unsupported mood: ${data.mood}`);
    }

    // Validar músicas se fornecidas
    if (data.songs && data.songs.length > 0) {
      await this.validateSongs(data.songs);
    }

    // Criar playlist
    const playlist = await this.playlistRepository.create(data);
    
    // Log da operação (em produção, usar logger adequado)
    console.log(`Playlist created: ${playlist.id} by user: ${data.userId}`);
    
    return playlist;
  }

  /**
   * Busca playlists do usuário
   */
  async getUserPlaylists(userId: string, limit = 20, offset = 0): Promise<Playlist[]> {
    // Verificar se o usuário existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.playlistRepository.findByUserId(userId, limit, offset);
  }

  /**
   * Busca playlist por ID (com verificação de propriedade)
   */
  async getPlaylistById(id: string, userId: string): Promise<Playlist | null> {
    const playlist = await this.playlistRepository.findById(id);
    
    if (!playlist) {
      return null;
    }

    // Verificar se o usuário é o dono da playlist
    if (playlist.userId !== userId) {
      throw new Error('Access denied: You can only access your own playlists');
    }

    return playlist;
  }

  /**
   * Atualiza uma playlist
   */
  async updatePlaylist(id: string, data: UpdatePlaylistData, userId: string): Promise<Playlist> {
    // Verificar se a playlist existe e pertence ao usuário
    const existingPlaylist = await this.getPlaylistById(id, userId);
    if (!existingPlaylist) {
      throw new Error('Playlist not found or access denied');
    }

    // Validações específicas para atualização
    if (data.name && data.name.length > 100) {
      throw new Error('Playlist name too long');
    }

    if (data.description && data.description.length > 500) {
      throw new Error('Playlist description too long');
    }

    return this.playlistRepository.update(id, data);
  }

  /**
   * Remove uma playlist
   */
  async deletePlaylist(id: string, userId: string): Promise<void> {
    // Verificar se a playlist existe e pertence ao usuário
    const playlist = await this.getPlaylistById(id, userId);
    if (!playlist) {
      throw new Error('Playlist not found or access denied');
    }

    await this.playlistRepository.delete(id);
    console.log(`Playlist deleted: ${id} by user: ${userId}`);
  }

  /**
   * Adiciona música à playlist
   */
  async addSongToPlaylist(playlistId: string, songId: string, userId: string): Promise<void> {
    // Verificar se a playlist existe e pertence ao usuário
    const playlist = await this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      throw new Error('Playlist not found or access denied');
    }

    // Verificar se a música existe
    const song = await this.songRepository.findById(songId);
    if (!song) {
      throw new Error('Song not found');
    }

    // Verificar limite de músicas por playlist
    if (playlist.songs.length >= 100) {
      throw new Error('Maximum number of songs in playlist reached');
    }

    // Verificar se a música já está na playlist
    const existingSong = playlist.songs.find(ps => ps.songId === songId);
    if (existingSong) {
      throw new Error('Song already exists in playlist');
    }

    await this.playlistRepository.addSong(playlistId, songId);
  }

  /**
   * Remove música da playlist
   */
  async removeSongFromPlaylist(playlistId: string, songId: string, userId: string): Promise<void> {
    // Verificar se a playlist existe e pertence ao usuário
    const playlist = await this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      throw new Error('Playlist not found or access denied');
    }

    await this.playlistRepository.removeSong(playlistId, songId);
  }

  /**
   * Reordena músicas da playlist
   */
  async reorderPlaylistSongs(playlistId: string, songIds: string[], userId: string): Promise<void> {
    // Verificar se a playlist existe e pertence ao usuário
    const playlist = await this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      throw new Error('Playlist not found or access denied');
    }

    // Validar se todas as músicas pertencem à playlist
    const playlistSongIds = playlist.songs.map(ps => ps.songId);
    const invalidSongs = songIds.filter(id => !playlistSongIds.includes(id));
    
    if (invalidSongs.length > 0) {
      throw new Error(`Invalid songs: ${invalidSongs.join(', ')}`);
    }

    await this.playlistRepository.reorderSongs(playlistId, songIds);
  }

  /**
   * Gera playlist baseada em humor
   * Demonstra lógica de negócio complexa
   */
  async generatePlaylistByMood(mood: Mood, userId: string, platform: Platform): Promise<Playlist> {
    const moodConfig = MOOD_CONFIG[mood];
    const platformConfig = PLATFORM_CONFIG[platform];

    // Buscar músicas que correspondem ao humor
    const songs = await this.findSongsByMood(mood, platform);
    
    if (songs.length === 0) {
      throw new Error(`No songs found for mood: ${mood}`);
    }

    // Criar playlist com nome baseado no humor
    const playlistName = `${moodConfig.name} Playlist - ${new Date().toLocaleDateString()}`;
    
    const playlistData: CreatePlaylistData = {
      name: playlistName,
      description: `Playlist gerada automaticamente baseada no humor: ${moodConfig.name}`,
      platform,
      mood,
      playlistType: 'mood',
      userId,
      isPublic: false,
      songs: songs.slice(0, 20).map((song, index) => ({
        songId: song.id,
        position: index,
        addedBy: userId
      }))
    };

    return this.createPlaylist(playlistData);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Valida dados da playlist
   */
  private async validatePlaylistData(data: CreatePlaylistData): Promise<void> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Playlist name is required');
    }

    if (data.name.length > 100) {
      throw new Error('Playlist name too long');
    }

    if (data.description && data.description.length > 500) {
      throw new Error('Playlist description too long');
    }

    if (!data.userId) {
      throw new Error('User ID is required');
    }
  }

  /**
   * Valida músicas fornecidas
   */
  private async validateSongs(songs: any[]): Promise<void> {
    for (const song of songs) {
      if (!song.songId) {
        throw new Error('Song ID is required');
      }

      const existingSong = await this.songRepository.findById(song.songId);
      if (!existingSong) {
        throw new Error(`Song not found: ${song.songId}`);
      }
    }
  }

  /**
   * Busca músicas por humor
   * Simula busca inteligente baseada em características musicais
   */
  private async findSongsByMood(mood: Mood, platform: Platform): Promise<any[]> {
    const moodConfig = MOOD_CONFIG[mood];
    
    // Buscar músicas por gênero (simulação)
    const songs: any[] = [];
    
    for (const genre of moodConfig.genres) {
      const genreSongs = await this.songRepository.findByGenre(genre, 5);
      songs.push(...genreSongs);
    }

    // Filtrar por plataforma
    return songs.filter(song => song.platform === platform);
  }
}
