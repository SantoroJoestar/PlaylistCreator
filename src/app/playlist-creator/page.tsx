/**
 * 🎵 Playlist Creator Page
 * 
 * Página completa para criação e gerenciamento de playlists:
 * - Criação de playlists
 * - Busca de músicas
 * - Conversão entre plataformas
 * - Recomendações inteligentes
 */

'use client';

import { useState, useEffect } from 'react';
import { Platform, Mood } from '@/lib/config/platforms';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  platform: Platform;
  previewUrl?: string;
  imageUrl?: string;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  platform: Platform;
  mood?: Mood;
  playlistType: string;
  isPublic: boolean;
  songCount: number;
  duration?: number;
  createdAt: string;
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    album?: string;
    duration: number;
    position: number;
    addedAt: string;
  }>;
}

interface ConversionResult {
  success: boolean;
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
}

export default function PlaylistCreatorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para criação de playlist
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    platform: 'spotify' as Platform,
    mood: 'happy' as Mood,
    playlistType: 'mood',
    isPublic: false
  });

  // Estados para busca de músicas
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);

  // Estados para conversão
  const [convertingPlaylist, setConvertingPlaylist] = useState<string | null>(null);
  const [conversionTarget, setConversionTarget] = useState<Platform>('youtube');

  // Estados para recomendações
  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Verificar autenticação
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens);
      fetchUserData(parsedTokens.accessToken);
    }
  }, []);

  const fetchUserData = async (accessToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
        await fetchPlaylists(accessToken);
      } else {
        localStorage.removeItem('auth_tokens');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchPlaylists = async (accessToken: string) => {
    try {
      const response = await fetch('/api/playlists', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setPlaylists(result.data.playlists);
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (!storedTokens) {
        throw new Error('Not authenticated');
      }

      const parsedTokens = JSON.parse(storedTokens);

      const playlistData = {
        ...newPlaylist,
        songs: selectedSongs.map((song, index) => ({
          songId: song.id,
          position: index
        }))
      };

      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${parsedTokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(playlistData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Playlist criada com sucesso!');
        setNewPlaylist({
          name: '',
          description: '',
          platform: 'spotify',
          mood: 'happy',
          playlistType: 'mood',
          isPublic: false
        });
        setSelectedSongs([]);
        await fetchPlaylists(parsedTokens.accessToken);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Falha ao criar playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSongs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test/integrations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: newPlaylist.platform,
          query: searchQuery,
          limit: 10
        })
      });

      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data.results);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Falha ao buscar músicas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSong = (song: Song) => {
    if (!selectedSongs.find(s => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleRemoveSong = (songId: string) => {
    setSelectedSongs(selectedSongs.filter(s => s.id !== songId));
  };

  const handleConvertPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setConvertingPlaylist(playlistId);

    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (!storedTokens) {
        throw new Error('Not authenticated');
      }

      const parsedTokens = JSON.parse(storedTokens);

      const response = await fetch(`/api/playlists/${playlistId}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${parsedTokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetPlatform: conversionTarget
        })
      });

      const result = await response.json();

      if (result.success) {
        const conversion: ConversionResult = result.data.conversion;
        setSuccess(`Playlist convertida com sucesso! ${conversion.convertedPlaylist?.matchedSongs}/${conversion.originalPlaylist.songCount} músicas encontradas.`);
        await fetchPlaylists(parsedTokens.accessToken);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Falha ao converter playlist');
    } finally {
      setIsLoading(false);
      setConvertingPlaylist(null);
    }
  };

  const handleGetRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (!storedTokens) {
        throw new Error('Not authenticated');
      }

      const parsedTokens = JSON.parse(storedTokens);

      const response = await fetch('/api/recommendations/personalized', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${parsedTokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user!.id,
          mood: newPlaylist.mood,
          limit: 10
        })
      });

      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data.songs);
        setShowRecommendations(true);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Falha ao obter recomendações');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🔐 Acesso Negado</h1>
          <p className="text-xl text-gray-300 mb-8">Você precisa estar logado para acessar esta página</p>
          <a 
            href="/auth-test"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎵 Playlist Creator
          </h1>
          <p className="text-xl text-gray-300">
            Crie, gerencie e converta suas playlists entre plataformas
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-300">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Create Playlist */}
          <div className="space-y-8">
            {/* Create Playlist Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">
                🎨 Criar Nova Playlist
              </h2>
              
              <form onSubmit={handleCreatePlaylist} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Nome da Playlist:
                    </label>
                    <input
                      type="text"
                      value={newPlaylist.name}
                      onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                      className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                      placeholder="Minha Playlist Incrível"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Plataforma:
                    </label>
                    <select
                      value={newPlaylist.platform}
                      onChange={(e) => setNewPlaylist({ ...newPlaylist, platform: e.target.value as Platform })}
                      className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white focus:outline-none focus:border-white"
                    >
                      <option value="spotify">Spotify</option>
                      <option value="youtube">YouTube Music</option>
                      <option value="apple">Apple Music</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Descrição:
                  </label>
                  <textarea
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                    className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="Descreva sua playlist..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Humor:
                    </label>
                    <select
                      value={newPlaylist.mood}
                      onChange={(e) => setNewPlaylist({ ...newPlaylist, mood: e.target.value as Mood })}
                      className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white focus:outline-none focus:border-white"
                    >
                      <option value="happy">😊 Feliz</option>
                      <option value="sad">😢 Triste</option>
                      <option value="energetic">⚡ Energético</option>
                      <option value="calm">😌 Calmo</option>
                      <option value="romantic">💕 Romântico</option>
                      <option value="focused">🎯 Focado</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center text-white">
                      <input
                        type="checkbox"
                        checked={newPlaylist.isPublic}
                        onChange={(e) => setNewPlaylist({ ...newPlaylist, isPublic: e.target.checked })}
                        className="mr-2"
                      />
                      Playlist Pública
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !newPlaylist.name}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? '⏳ Criando...' : '🎵 Criar Playlist'}
                </button>
              </form>
            </div>

            {/* Search Songs */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">
                🔍 Buscar Músicas
              </h2>
              
              <form onSubmit={handleSearchSongs} className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="Buscar músicas..."
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '⏳' : '🔍'}
                  </button>
                </div>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-white font-medium mb-4">Resultados da Busca:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">{song.title}</p>
                          <p className="text-gray-400 text-sm">{song.artist}</p>
                          <p className="text-gray-500 text-xs">{formatDuration(song.duration)}</p>
                        </div>
                        <button
                          onClick={() => handleAddSong(song)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          ➕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="mt-6">
                <button
                  onClick={handleGetRecommendations}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? '⏳' : '🧠'} Obter Recomendações Inteligentes
                </button>
              </div>

              {showRecommendations && recommendations.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-white font-medium mb-4">Recomendações:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recommendations.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">{song.title}</p>
                          <p className="text-gray-400 text-sm">{song.artist}</p>
                          <p className="text-gray-500 text-xs">{formatDuration(song.duration)}</p>
                        </div>
                        <button
                          onClick={() => handleAddSong(song)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          ➕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Selected Songs & Playlists */}
          <div className="space-y-8">
            {/* Selected Songs */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">
                🎶 Músicas Selecionadas ({selectedSongs.length})
              </h2>
              
              {selectedSongs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Nenhuma música selecionada ainda
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center flex-1">
                        <span className="text-gray-400 text-sm mr-3">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{song.title}</p>
                          <p className="text-gray-400 text-sm">{song.artist}</p>
                        </div>
                        <span className="text-gray-500 text-xs">{formatDuration(song.duration)}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveSong(song.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors ml-3"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Playlists */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">
                📚 Suas Playlists ({playlists.length})
              </h2>
              
              {playlists.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Você ainda não tem playlists
                </p>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="p-4 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-white font-medium">{playlist.name}</h3>
                          <p className="text-gray-400 text-sm">
                            {playlist.platform} • {playlist.songCount} músicas
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={conversionTarget}
                            onChange={(e) => setConversionTarget(e.target.value as Platform)}
                            className="text-xs p-1 rounded bg-white/10 border border-gray-600 text-white"
                          >
                            <option value="spotify">Spotify</option>
                            <option value="youtube">YouTube</option>
                            <option value="apple">Apple</option>
                          </select>
                          <button
                            onClick={() => handleConvertPlaylist(playlist.id)}
                            disabled={isLoading && convertingPlaylist === playlist.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            {isLoading && convertingPlaylist === playlist.id ? '⏳' : '🔄'}
                          </button>
                        </div>
                      </div>
                      {playlist.description && (
                        <p className="text-gray-500 text-sm mb-2">{playlist.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>🎵 {playlist.playlistType}</span>
                        {playlist.mood && <span>😊 {playlist.mood}</span>}
                        <span>{playlist.isPublic ? '🌍 Pública' : '🔒 Privada'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Architecture Info */}
        <div className="mt-12 bg-white/5 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">🏗️ Funcionalidades Implementadas:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
            <div>
              <div className="font-medium text-white mb-2">✅ Criação de Playlists</div>
              <div>Formulário completo com validação</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Busca de Músicas</div>
              <div>Integração com APIs externas</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Conversão entre Plataformas</div>
              <div>Algoritmo inteligente de matching</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Recomendações Inteligentes</div>
              <div>Baseadas em humor e histórico</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Gerenciamento Completo</div>
              <div>CRUD completo de playlists</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Interface Responsiva</div>
              <div>Design moderno e intuitivo</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
