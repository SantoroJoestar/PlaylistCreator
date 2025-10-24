/**
 * 🔐 Authentication Middleware
 * 
 * Middleware para proteger rotas que requerem autenticação
 * Valida tokens JWT e injeta dados do usuário
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/AuthService';
import { prisma } from '@/lib/database';

// ==================== TYPES ====================

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  platforms?: string[];
}

// ==================== MIDDLEWARE ====================

const authService = new AuthService(prisma);

/**
 * Middleware de autenticação
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = request.headers.get('authorization');
      
      // Se autenticação não é obrigatória, continuar sem validação
      if (!options.required && !authHeader) {
        return handler(request as AuthenticatedRequest);
      }

      // Se autenticação é obrigatória mas não há header
      if (options.required && (!authHeader || !authHeader.startsWith('Bearer '))) {
        return NextResponse.json({
          success: false,
          error: 'Authorization header required',
          timestamp: new Date()
        }, { status: 401 });
      }

      // Validar token
      const token = authHeader?.substring(7);
      const user = await authService.validateToken(token!);

      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'Invalid or expired token',
          timestamp: new Date()
        }, { status: 401 });
      }

      // Verificar plataformas se especificado
      if (options.platforms && options.platforms.length > 0) {
        const userPlatforms = await authService.getUserPlatforms(user.id);
        const connectedPlatforms = userPlatforms
          .filter(p => p.isActive)
          .map(p => p.platform.toLowerCase());

        const hasRequiredPlatform = options.platforms.some(platform => 
          connectedPlatforms.includes(platform.toLowerCase())
        );

        if (!hasRequiredPlatform) {
          return NextResponse.json({
            success: false,
            error: `Required platform access not found. Connected platforms: ${connectedPlatforms.join(', ')}`,
            timestamp: new Date()
          }, { status: 403 });
        }
      }

      // Adicionar dados do usuário à requisição
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      return handler(authenticatedRequest);

    } catch (error) {
      console.error('Authentication middleware error:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        timestamp: new Date()
      }, { status: 500 });
    }
  };
}

/**
 * Middleware para rotas públicas (sem autenticação obrigatória)
 */
export function withOptionalAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { required: false });
}

/**
 * Middleware para rotas protegidas (autenticação obrigatória)
 */
export function withRequiredAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { required: true });
}

/**
 * Middleware para rotas que requerem plataforma específica
 */
export function withPlatformAuth(
  platforms: string[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(handler, { required: true, platforms });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extrai token de autorização do header
 */
export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

/**
 * Valida token sem usar middleware
 */
export async function validateTokenDirect(token: string): Promise<any> {
  return authService.validateToken(token);
}

/**
 * Obtém plataformas conectadas do usuário
 */
export async function getUserConnectedPlatforms(userId: string): Promise<any[]> {
  return authService.getUserPlatforms(userId);
}

/**
 * Verifica se usuário tem acesso a uma plataforma
 */
export async function hasPlatformAccess(userId: string, platform: string): Promise<boolean> {
  const platforms = await authService.getUserPlatforms(userId);
  return platforms.some(p => 
    p.platform.toLowerCase() === platform.toLowerCase() && p.isActive
  );
}
