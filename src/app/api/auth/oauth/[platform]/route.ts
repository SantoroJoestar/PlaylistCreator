/**
 * 🔐 OAuth API Routes
 * 
 * Endpoints para autenticação OAuth:
 * - GET /api/auth/oauth/:platform - Iniciar OAuth
 * - GET /api/auth/oauth/:platform/callback - Callback OAuth
 * - DELETE /api/auth/oauth/:platform - Revogar acesso
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/AuthService';
import { prisma } from '@/lib/database';
import { Platform } from '@/lib/config/platforms';

// ==================== TYPES ====================

interface OAuthInitiateResponse {
  success: boolean;
  data?: {
    authUrl: string;
    platform: string;
    state: string;
  };
  error?: string;
  timestamp: Date;
}

interface OAuthCallbackResponse {
  success: boolean;
  data?: {
    platform: string;
    connected: boolean;
    userProfile: any;
  };
  error?: string;
  timestamp: Date;
}

// ==================== SERVICE INITIALIZATION ====================

const authService = new AuthService(prisma);

// ==================== API HANDLERS ====================

/**
 * GET /api/auth/oauth/:platform
 * Inicia processo OAuth para uma plataforma
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
): Promise<NextResponse<OAuthInitiateResponse>> {
  try {
    const platform = params.platform.toLowerCase() as Platform;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    // Validar plataforma
    if (!['spotify', 'youtube', 'apple'].includes(platform)) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported platform',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Validar userId
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Iniciar OAuth
    const result = await authService.initiateOAuth(platform, userId);

    const response: OAuthInitiateResponse = {
      success: true,
      data: {
        authUrl: result.authUrl,
        platform,
        state: result.state
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('OAuth initiation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'OAuth initiation failed',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * GET /api/auth/oauth/:platform/callback
 * Processa callback OAuth
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
): Promise<NextResponse<OAuthCallbackResponse>> {
  try {
    const platform = params.platform.toLowerCase() as Platform;
    const body = await request.json();
    const { code, state, userId } = body;

    // Validar plataforma
    if (!['spotify', 'youtube', 'apple'].includes(platform)) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported platform',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Validar dados obrigatórios
    if (!code || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Code and userId are required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Processar callback OAuth
    const result = await authService.handleOAuthCallback({
      platform,
      code,
      state
    }, userId);

    const response: OAuthCallbackResponse = {
      success: true,
      data: {
        platform,
        connected: true,
        userProfile: result.userProfile
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('OAuth callback failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'OAuth callback failed',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/oauth/:platform
 * Revoga acesso a uma plataforma
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { platform: string } }
): Promise<NextResponse> {
  try {
    const platform = params.platform.toLowerCase() as Platform;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header required',
        timestamp: new Date()
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await authService.validateToken(token);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token',
        timestamp: new Date()
      }, { status: 401 });
    }

    // Validar plataforma
    if (!['spotify', 'youtube', 'apple'].includes(platform)) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported platform',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Revogar acesso
    await authService.revokePlatformAccess(platform, user.id);

    return NextResponse.json({
      success: true,
      data: { 
        message: `Access to ${platform} revoked successfully`,
        platform 
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Platform access revocation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke platform access',
      timestamp: new Date()
    }, { status: 500 });
  }
}
