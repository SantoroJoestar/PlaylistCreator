/**
 * 🔐 Authentication API Routes
 * 
 * Endpoints para autenticação:
 * - POST /api/auth/register - Registro de usuário
 * - POST /api/auth/login - Login de usuário
 * - POST /api/auth/refresh - Renovar token
 * - GET /api/auth/me - Obter dados do usuário
 * - POST /api/auth/logout - Logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/AuthService';
import { prisma } from '@/lib/database';
import { Platform } from '@/lib/config/platforms';

// ==================== TYPES ====================

interface AuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: Date;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  error?: string;
  timestamp: Date;
}

interface RefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
  timestamp: Date;
}

// ==================== SERVICE INITIALIZATION ====================

const authService = new AuthService(prisma);

// ==================== API HANDLERS ====================

/**
 * POST /api/auth/register
 * Registra um novo usuário
 */
export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validar dados obrigatórios
    if (!email || !password || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email, password, and name are required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Registrar usuário
    const result = await authService.register({
      email,
      password,
      name
    });

    const response: AuthResponse = {
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          createdAt: result.user.createdAt
        },
        tokens: result.tokens
      },
      timestamp: new Date()
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Registration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
      timestamp: new Date()
    }, { status: 400 });
  }
}

/**
 * POST /api/auth/login
 * Autentica usuário existente
 */
export async function PUT(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validar dados obrigatórios
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Autenticar usuário
    const result = await authService.login({
      email,
      password
    });

    const response: AuthResponse = {
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          createdAt: result.user.createdAt
        },
        tokens: result.tokens
      },
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Login failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
      timestamp: new Date()
    }, { status: 401 });
  }
}

/**
 * POST /api/auth/refresh
 * Renova token de acesso
 */
export async function PATCH(request: NextRequest): Promise<NextResponse<RefreshResponse>> {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'Refresh token is required',
        timestamp: new Date()
      }, { status: 400 });
    }

    // Renovar token
    const tokens = await authService.refreshToken(refreshToken);

    const response: RefreshResponse = {
      success: true,
      data: tokens,
      timestamp: new Date()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Token refresh failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
      timestamp: new Date()
    }, { status: 401 });
  }
}

/**
 * GET /api/auth/me
 * Obtém dados do usuário autenticado
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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

    // Obter plataformas conectadas
    const platforms = await authService.getUserPlatforms(user.id);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          preferences: user.preferences
        },
        platforms: platforms.map(p => ({
          platform: p.platform,
          isActive: p.isActive,
          connectedAt: p.connectedAt,
          lastSyncAt: p.lastSyncAt
        }))
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get user data failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user data',
      timestamp: new Date()
    }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/logout
 * Logout do usuário
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
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

    // Em uma implementação completa, adicionaríamos o token a uma blacklist
    // Por enquanto, apenas retornamos sucesso

    return NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Logout failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
      timestamp: new Date()
    }, { status: 500 });
  }
}
