/**
 * 🎵 Platform Integration Test API
 * 
 * API para testar integrações com plataformas externas
 * Demonstra nossa arquitetura funcionando com APIs reais
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformServiceFactory } from '@/factories';
import { SpotifyService, YouTubeService, AppleMusicService } from '@/services/integrations';
import { Platform } from '@/lib/config/platforms';

// ==================== TYPES ====================

interface IntegrationTestResponse {
  success: boolean;
  data?: {
    platform: string;
    authUrl: string;
    features: string[];
    status: 'ready' | 'needs_config' | 'error';
    message: string;
  };
  error?: string;
  timestamp: Date;
}

interface SearchTestResponse {
  success: boolean;
  data?: {
    platform: string;
    query: string;
    results: any[];
    count: number;
  };
  error?: string;
  timestamp: Date;
}

// ==================== API HANDLERS ====================

/**
 * GET /api/test/integrations
 * Testa configuração e status das integrações
 */
export async function GET(): Promise<NextResponse<IntegrationTestResponse[]>> {
  try {
    console.log('🔍 Testing platform integrations...');

    const platforms: Platform[] = ['spotify', 'youtube', 'apple'];
    const results: IntegrationTestResponse[] = [];

    for (const platform of platforms) {
      try {
        const service = PlatformServiceFactory.create(platform);
        let authUrl = '';
        let status: 'ready' | 'needs_config' | 'error' = 'needs_config';
        let message = '';
        let features: string[] = [];

        switch (platform) {
          case 'spotify':
            const spotifyService = service as SpotifyService;
            authUrl = spotifyService.generateAuthUrl();
            features = [
              'Search tracks',
              'Get track details',
              'Get audio features',
              'Create playlists',
              'Add tracks to playlists',
              'Get user playlists'
            ];
            
            if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
              status = 'ready';
              message = 'Spotify integration configured and ready';
            } else {
              message = 'Spotify integration needs configuration (CLIENT_ID and CLIENT_SECRET)';
            }
            break;

          case 'youtube':
            const youtubeService = service as YouTubeService;
            authUrl = youtubeService.generateAuthUrl();
            features = [
              'Search videos',
              'Get video details',
              'Create playlists',
              'Add videos to playlists',
              'Get user playlists'
            ];
            
            if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
              status = 'ready';
              message = 'YouTube Music integration configured and ready';
            } else {
              message = 'YouTube integration needs configuration (CLIENT_ID and CLIENT_SECRET)';
            }
            break;

          case 'apple':
            const appleService = service as AppleMusicService;
            authUrl = appleService.generateAuthUrl();
            features = [
              'Search songs',
              'Get song details',
              'Get user playlists',
              'Create playlists (limited)',
              'Add songs to playlists (limited)'
            ];
            
            if (process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
              status = 'ready';
              message = 'Apple Music integration configured and ready';
            } else {
              message = 'Apple Music integration needs configuration (TEAM_ID, KEY_ID, and PRIVATE_KEY)';
            }
            break;
        }

        results.push({
          success: true,
          data: {
            platform,
            authUrl,
            features,
            status,
            message
          },
          timestamp: new Date()
        });

      } catch (error) {
        results.push({
          success: false,
          error: `Failed to initialize ${platform} service: ${error.message}`,
          timestamp: new Date()
        });
      }
    }

    console.log('✅ Integration tests completed');
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    
    return NextResponse.json([{
      success: false,
      error: error instanceof Error ? error.message : 'Integration test failed',
      timestamp: new Date()
    }], { status: 500 });
  }
}

/**
 * POST /api/test/integrations/search
 * Testa busca de músicas em uma plataforma específica
 */
export async function POST(request: NextRequest): Promise<NextResponse<SearchTestResponse>> {
  try {
    const body = await request.json();
    const { platform, query, limit = 5 } = body;

    if (!platform || !query) {
      return NextResponse.json({
        success: false,
        error: 'Platform and query are required',
        timestamp: new Date()
      }, { status: 400 });
    }

    if (!PlatformServiceFactory.isSupported(platform)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported platform: ${platform}`,
        timestamp: new Date()
      }, { status: 400 });
    }

    console.log(`🔍 Testing search on ${platform} for query: "${query}"`);

    const service = PlatformServiceFactory.create(platform as Platform);
    let results: any[] = [];

    try {
      switch (platform) {
        case 'spotify':
          const spotifyService = service as SpotifyService;
          const spotifyTracks = await spotifyService.searchTracks(query, limit);
          results = spotifyTracks.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0]?.name,
            album: track.album.name,
            duration: Math.floor(track.duration_ms / 1000),
            previewUrl: track.preview_url,
            imageUrl: track.album.images[0]?.url
          }));
          break;

        case 'youtube':
          const youtubeService = service as YouTubeService;
          const youtubeVideos = await youtubeService.searchVideos(query, limit);
          results = youtubeVideos.map(video => ({
            id: video.id,
            title: video.snippet.title,
            artist: video.snippet.channelTitle,
            album: undefined,
            duration: parseYouTubeDuration(video.contentDetails.duration),
            previewUrl: undefined,
            imageUrl: video.snippet.thumbnails.high?.url
          }));
          break;

        case 'apple':
          const appleService = service as AppleMusicService;
          const appleTracks = await appleService.searchSongs(query, limit);
          results = appleTracks.map(track => ({
            id: track.id,
            title: track.attributes.name,
            artist: track.attributes.artistName,
            album: track.attributes.albumName,
            duration: Math.floor(track.attributes.durationInMillis / 1000),
            previewUrl: track.attributes.previews?.[0]?.url,
            imageUrl: track.attributes.artwork?.url?.replace('{w}', '300').replace('{h}', '300')
          }));
          break;
      }

      const response: SearchTestResponse = {
        success: true,
        data: {
          platform,
          query,
          results,
          count: results.length
        },
        timestamp: new Date()
      };

      console.log(`✅ Search test completed: ${results.length} results found`);
      return NextResponse.json(response);

    } catch (error) {
      console.error(`❌ Search test failed for ${platform}:`, error);
      
      return NextResponse.json({
        success: false,
        error: `Search failed on ${platform}: ${error.message}`,
        timestamp: new Date()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Search test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Search test failed',
      timestamp: new Date()
    }, { status: 500 });
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Converte duração ISO 8601 do YouTube para segundos
 */
function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}
