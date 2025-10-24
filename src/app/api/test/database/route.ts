/**
 * 🗄️ Database Test API
 * 
 * API para testar conexão e operações do banco de dados
 * Demonstra nossa arquitetura MVC funcionando com dados reais
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbUtils } from '@/lib/database';
import { PlaylistService, MusicService, MoodAnalysisService } from '@/services';
import { 
  PlaylistRepository, 
  UserRepository, 
  SongRepository 
} from '@/repositories';

// ==================== TYPES ====================

interface DatabaseTestResponse {
  success: boolean;
  data?: {
    connection: boolean;
    stats: any;
    playlists: any[];
    users: any[];
    songs: any[];
  };
  error?: string;
  timestamp: Date;
}

// ==================== SERVICES INITIALIZATION ====================

// Inicializar Services com Prisma real
const playlistService = new PlaylistService(
  new PlaylistRepository(prisma),
  new UserRepository(prisma),
  new SongRepository(prisma)
);

const musicService = new MusicService(new SongRepository(prisma));
const moodAnalysisService = new MoodAnalysisService();

// ==================== API HANDLERS ====================

/**
 * GET /api/test/database
 * Testa conexão e operações do banco de dados
 */
export async function GET(): Promise<NextResponse<DatabaseTestResponse>> {
  try {
    console.log('🔍 Testing database connection...');

    // 1. Testar conexão
    const connection = await dbUtils.checkConnection();
    
    if (!connection) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        timestamp: new Date()
      }, { status: 500 });
    }

    // 2. Buscar estatísticas
    const stats = await dbUtils.getDatabaseStats();

    // 3. Testar operações básicas
    const [users, playlists, songs] = await Promise.all([
      prisma.user.findMany({ take: 5 }),
      prisma.playlist.findMany({ 
        take: 5,
        include: {
          user: true,
          songs: {
            include: { song: true },
            take: 3
          }
        }
      }),
      prisma.song.findMany({ take: 5 })
    ]);

    // 4. Testar Services
    let serviceTest = 'Services not tested';
    try {
      if (users.length > 0) {
        const userPlaylists = await playlistService.getUserPlaylists(users[0].id, 3);
        serviceTest = `Services working: ${userPlaylists.length} playlists found for user`;
      }
    } catch (error) {
      serviceTest = `Service test failed: ${error.message}`;
    }

    const response: DatabaseTestResponse = {
      success: true,
      data: {
        connection: true,
        stats,
        playlists: playlists.map(p => ({
          id: p.id,
          name: p.name,
          platform: p.platform,
          mood: p.mood,
          songCount: p.songCount,
          user: p.user.name,
          songs: p.songs.map(ps => ({
            title: ps.song.title,
            artist: ps.song.artist,
            position: ps.position
          }))
        })),
        users: users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt
        })),
        songs: songs.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          platform: s.platform,
          duration: s.duration
        }))
      },
      timestamp: new Date()
    };

    console.log('✅ Database test completed successfully');
    console.log(`📊 Found: ${users.length} users, ${playlists.length} playlists, ${songs.length} songs`);
    console.log(`🔧 Service test: ${serviceTest}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database test failed',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * POST /api/test/database
 * Cria dados de teste no banco
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'seed':
        // Executar seed do banco
        console.log('🌱 Running database seed...');
        
        // Criar usuário de teste
        const testUser = await prisma.user.upsert({
          where: { email: 'test@example.com' },
          update: {},
          create: {
            email: 'test@example.com',
            name: 'Test User',
            password: 'hashed_password_here',
            preferences: {
              defaultPlatform: 'SPOTIFY',
              favoriteGenres: ['pop', 'rock'],
              language: 'pt-BR'
            }
          }
        });

        // Criar música de teste
        const testSong = await prisma.song.upsert({
          where: { 
            platform_platformId: { 
              platform: 'SPOTIFY', 
              platformId: 'test_song_123' 
            } 
          },
          update: {},
          create: {
            title: 'Test Song',
            artist: 'Test Artist',
            album: 'Test Album',
            duration: 180,
            genre: 'pop',
            year: 2024,
            platform: 'SPOTIFY',
            platformId: 'test_song_123',
            previewUrl: 'https://example.com/preview.mp3',
            imageUrl: 'https://example.com/cover.jpg'
          }
        });

        // Criar playlist de teste
        const testPlaylist = await prisma.playlist.create({
          data: {
            name: 'Test Playlist',
            description: 'Playlist criada via API de teste',
            userId: testUser.id,
            platform: 'SPOTIFY',
            mood: 'HAPPY',
            playlistType: 'MOOD',
            isPublic: false,
            songCount: 1,
            duration: 180,
            songs: {
              create: {
                songId: testSong.id,
                position: 0,
                addedBy: testUser.id
              }
            }
          },
          include: {
            user: true,
            songs: {
              include: { song: true }
            }
          }
        });

        return NextResponse.json({
          success: true,
          data: {
            user: testUser,
            song: testSong,
            playlist: testPlaylist,
            message: 'Test data created successfully'
          },
          timestamp: new Date()
        });

      case 'clear':
        // Limpar banco de dados
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({
            success: false,
            error: 'Cannot clear database in production',
            timestamp: new Date()
          }, { status: 403 });
        }

        await dbUtils.clearDatabase();
        
        return NextResponse.json({
          success: true,
          data: { message: 'Database cleared successfully' },
          timestamp: new Date()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "seed" or "clear"',
          timestamp: new Date()
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Database operation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database operation failed',
      timestamp: new Date()
    }, { status: 500 });
  }
}
