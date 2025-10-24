/**
 * 🎵 API Route de Teste - Controller
 * 
 * Este é um exemplo de Controller na arquitetura MVC:
 * - Recebe requisições HTTP
 * - Processa dados
 * - Chama Services (Model)
 * - Retorna resposta
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_CONFIG, MOOD_CONFIG } from '@/lib/config/platforms';
import { Platform, Mood } from '@/lib/config/platforms';
import { PlaylistService, MusicService, MoodAnalysisService } from '@/services';
import { 
  PlaylistRepository, 
  UserRepository, 
  SongRepository 
} from '@/repositories';
import { PrismaClient } from '@prisma/client';

// ==================== TYPES ====================

interface TestPlaylistRequest {
  name: string;
  platform: Platform;
  mood: Mood;
  userId: string;
}

interface TestPlaylistResponse {
  success: boolean;
  data?: {
    playlistId: string;
    name: string;
    platform: string;
    mood: string;
    songCount: number;
    estimatedDuration: number;
  };
  error?: string;
  timestamp: Date;
}

// ==================== MOCK DATA ====================

const MOCK_SONGS = {
  happy: [
    { title: "Happy", artist: "Pharrell Williams", duration: 233 },
    { title: "Good Vibrations", artist: "The Beach Boys", duration: 216 },
    { title: "Don't Stop Me Now", artist: "Queen", duration: 211 }
  ],
  sad: [
    { title: "Someone You Loved", artist: "Lewis Capaldi", duration: 182 },
    { title: "All Too Well", artist: "Taylor Swift", duration: 329 },
    { title: "Hurt", artist: "Johnny Cash", duration: 218 }
  ],
  energetic: [
    { title: "Eye of the Tiger", artist: "Survivor", duration: 245 },
    { title: "Thunderstruck", artist: "AC/DC", duration: 292 },
    { title: "We Will Rock You", artist: "Queen", duration: 122 }
  ],
  calm: [
    { title: "Weightless", artist: "Marconi Union", duration: 485 },
    { title: "Clair de Lune", artist: "Claude Debussy", duration: 298 },
    { title: "River Flows in You", artist: "Yiruma", duration: 201 }
  ],
  romantic: [
    { title: "Perfect", artist: "Ed Sheeran", duration: 263 },
    { title: "All of Me", artist: "John Legend", duration: 269 },
    { title: "Thinking Out Loud", artist: "Ed Sheeran", duration: 281 }
  ],
  focused: [
    { title: "Study Music", artist: "Chill Study Beats", duration: 3600 },
    { title: "Concentration", artist: "Focus Music", duration: 1800 },
    { title: "Deep Work", artist: "Productivity Sounds", duration: 2700 }
  ]
};

// ==================== SERVICES INITIALIZATION ====================

// Mock Prisma Client (em produção, seria injetado)
const prisma = {} as PrismaClient;

// Inicializar Repositories
const playlistRepository = new PlaylistRepository(prisma);
const userRepository = new UserRepository(prisma);
const songRepository = new SongRepository(prisma);

// Inicializar Services
const playlistService = new PlaylistService(playlistRepository, userRepository, songRepository);
const musicService = new MusicService(songRepository);
const moodAnalysisService = new MoodAnalysisService();

// ==================== API HANDLERS ====================

/**
 * POST /api/test/playlist
 * Cria uma playlist de teste usando nossa arquitetura MVC
 */
export async function POST(request: NextRequest): Promise<NextResponse<TestPlaylistResponse>> {
  try {
    const body: TestPlaylistRequest = await request.json();
    
    // Validação básica (em um projeto real, usaríamos Zod)
    if (!body.name || !body.platform || !body.mood || !body.userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, platform, mood, userId',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Verificar se a plataforma é suportada
    if (!PLATFORM_CONFIG[body.platform]) {
      return NextResponse.json({
        success: false,
        error: `Unsupported platform: ${body.platform}`,
        timestamp: new Date()
      }, { status: 400 });
    }

    // Verificar se o humor é suportado
    if (!MOOD_CONFIG[body.mood]) {
      return NextResponse.json({
        success: false,
        error: `Unsupported mood: ${body.mood}`,
        timestamp: new Date()
      }, { status: 400 });
    }

    // 🎯 USANDO NOSSA ARQUITETURA MVC:
    
    // 1. Análise de humor usando MoodAnalysisService
    const mockResponses = [
      { question: 'Como você está se sentindo?', answer: body.mood, weight: 1 },
      { question: 'Qual seu nível de energia?', answer: 7, weight: 0.8 }
    ];
    
    const moodAnalysis = await moodAnalysisService.analyzeMood(mockResponses);
    
    // 2. Buscar músicas usando MusicService
    const songs = await musicService.getSongsByGenre(
      MOOD_CONFIG[body.mood].genres[0], 
      body.platform, 
      5
    );
    
    // 3. Criar playlist usando PlaylistService
    const playlistData = {
      name: body.name,
      description: `Playlist gerada baseada no humor: ${MOOD_CONFIG[body.mood].name}`,
      platform: body.platform,
      mood: body.mood,
      playlistType: 'mood' as const,
      userId: body.userId,
      isPublic: false,
      songs: songs.map((song, index) => ({
        songId: song.id,
        position: index,
        addedBy: body.userId
      }))
    };

    // Simular criação (em produção, seria: await playlistService.createPlaylist(playlistData))
    const playlistId = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalDuration = songs.reduce((acc, song) => acc + song.duration, 0);

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response: TestPlaylistResponse = {
      success: true,
      data: {
        playlistId,
        name: body.name,
        platform: PLATFORM_CONFIG[body.platform].name,
        mood: MOOD_CONFIG[body.mood].name,
        songCount: songs.length,
        estimatedDuration: Math.round(totalDuration / 60) // em minutos
      },
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creating test playlist:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * GET /api/test/platforms
 * Retorna informações sobre plataformas suportadas
 */
export async function GET(): Promise<NextResponse> {
  try {
    const platforms = Object.entries(PLATFORM_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      color: config.color,
      features: config.features,
      supported: true
    }));

    const moods = Object.entries(MOOD_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      emoji: config.emoji,
      color: config.color,
      genres: config.genres
    }));

    return NextResponse.json({
      success: true,
      data: {
        platforms,
        moods,
        architecture: {
          pattern: 'MVC',
          patterns: ['Factory', 'Repository', 'Object Literals'],
          principles: ['SOLID', 'DRY', 'KISS']
        }
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching test data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date()
    }, { status: 500 });
  }
}
