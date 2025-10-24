/**
 * 🎵 Playlist Creator - Página de Teste
 * 
 * Esta página demonstra nossa arquitetura MVC funcionando:
 * - View: Componente React
 * - Controller: API Route (próximo passo)
 * - Model: Services e Repositories
 */

'use client';

import { useState } from 'react';
import { PLATFORM_CONFIG, MOOD_CONFIG } from '@/lib/config/platforms';
import { Platform, Mood } from '@/lib/config/platforms';

export default function TestPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('spotify');
  const [selectedMood, setSelectedMood] = useState<Mood>('happy');
  const [playlistName, setPlaylistName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      alert('Por favor, digite um nome para a playlist!');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/test/playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          platform: selectedPlatform,
          mood: selectedMood,
          userId: 'test-user-123' // Mock user ID
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Playlist "${result.data.name}" criada com sucesso!\n\n` +
              `🎵 Plataforma: ${result.data.platform}\n` +
              `😊 Humor: ${result.data.mood}\n` +
              `🎶 Músicas: ${result.data.songCount}\n` +
              `⏱️ Duração: ${result.data.estimatedDuration} minutos\n` +
              `🆔 ID: ${result.data.playlistId}`);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('❌ Erro ao criar playlist. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎵 Playlist Creator
          </h1>
          <p className="text-xl text-gray-300">
            Teste da arquitetura MVC + Design Patterns + SOLID
          </p>
        </div>

        {/* Test Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-6">
            🧪 Página de Teste - Arquitetura MVC
          </h2>

          {/* Platform Selection */}
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-3">
              Escolha a Plataforma:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key as Platform)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPlatform === key
                      ? 'border-white bg-white/20'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ borderColor: selectedPlatform === key ? config.color : undefined }}
                >
                  <div className="text-center">
                    <div 
                      className="w-8 h-8 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: config.color }}
                    />
                    <div className="text-white font-medium">{config.name}</div>
                    <div className="text-gray-400 text-sm">
                      {config.features.createPlaylist ? '✅ Criar Playlist' : '❌ Criar Playlist'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-3">
              Escolha o Humor:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(MOOD_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMood(key as Mood)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedMood === key
                      ? 'border-white bg-white/20'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ borderColor: selectedMood === key ? config.color : undefined }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{config.emoji}</div>
                    <div className="text-white text-sm font-medium">{config.name}</div>
                    <div className="text-gray-400 text-xs">
                      {config.genres.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Playlist Name */}
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-3">
              Nome da Playlist:
            </label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Ex: Minha Playlist Incrível"
              className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreatePlaylist}
            disabled={!playlistName || isLoading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
              !playlistName || isLoading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
            }`}
          >
            {isLoading ? '⏳ Criando...' : '🎵 Criar Playlist de Teste'}
          </button>

          {/* Architecture Info */}
          <div className="mt-8 p-4 bg-black/20 rounded-lg">
            <h3 className="text-white font-semibold mb-3">🏗️ Arquitetura Implementada:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-green-400 font-medium">✅ MVC Pattern</div>
                <div className="text-gray-400">Model-View-Controller</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-medium">✅ Design Patterns</div>
                <div className="text-gray-400">Factory, Repository, Object Literals</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-medium">✅ SOLID Principles</div>
                <div className="text-gray-400">Single Responsibility, etc.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">🚀 Próximos Passos:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <div className="font-medium text-white mb-2">1. Implementar Services</div>
              <div>Lógica de negócio para playlists</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">2. Criar API Routes</div>
              <div>Controllers para endpoints</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">3. Configurar Prisma</div>
              <div>Banco de dados PostgreSQL</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">4. Integrar APIs</div>
              <div>Spotify, YouTube Music</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
