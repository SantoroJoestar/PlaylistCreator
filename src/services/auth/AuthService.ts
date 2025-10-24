/**
 * 🔐 Authentication Service
 * 
 * Implementa sistema de autenticação completo:
 * - Autenticação local (email/senha)
 * - OAuth para múltiplas plataformas
 * - JWT tokens e refresh tokens
 * - Gerenciamento de sessões
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, PlatformIntegration } from '@prisma/client';
import { Platform } from '@/lib/config/platforms';
import { PlatformServiceFactory } from '@/factories';
import { SpotifyService, YouTubeService, AppleMusicService } from '@/services/integrations';

// ==================== TYPES ====================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface OAuthCallbackData {
  platform: Platform;
  code: string;
  state?: string;
}

export interface PlatformAuthResult {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  userProfile: any;
}

export interface IAuthService {
  // Local Authentication
  register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }>;
  login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  validateToken(token: string): Promise<User | null>;
  
  // OAuth Authentication
  initiateOAuth(platform: Platform, userId: string): Promise<{ authUrl: string; state: string }>;
  handleOAuthCallback(data: OAuthCallbackData, userId: string): Promise<PlatformAuthResult>;
  revokePlatformAccess(platform: Platform, userId: string): Promise<void>;
  
  // Platform Management
  getUserPlatforms(userId: string): Promise<PlatformIntegration[]>;
  getPlatformAccessToken(platform: Platform, userId: string): Promise<string | null>;
  refreshPlatformToken(platform: Platform, userId: string): Promise<AuthTokens>;
}

export class AuthService implements IAuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(private prisma: PrismaClient) {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  // ==================== LOCAL AUTHENTICATION ====================

  /**
   * Registra um novo usuário
   */
  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    // Validar dados
    this.validateRegisterData(data);

    // Verificar se usuário já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        preferences: {
          defaultPlatform: 'SPOTIFY',
          favoriteGenres: [],
          language: 'pt-BR',
          theme: 'dark'
        }
      }
    });

    // Gerar tokens
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Autentica usuário com email e senha
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    // Validar credenciais
    this.validateLoginCredentials(credentials);

    // Buscar usuário
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Gerar tokens
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Renova token de acesso
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Valida token de acesso
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as any;
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  // ==================== OAUTH AUTHENTICATION ====================

  /**
   * Inicia processo OAuth para uma plataforma
   */
  async initiateOAuth(platform: Platform, userId: string): Promise<{ authUrl: string; state: string }> {
    // Verificar se usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Gerar state para segurança
    const state = this.generateState(userId, platform);

    // Obter URL de autorização
    const service = PlatformServiceFactory.create(platform);
    let authUrl = '';

    switch (platform) {
      case 'spotify':
        const spotifyService = service as SpotifyService;
        authUrl = spotifyService.generateAuthUrl(state);
        break;
      case 'youtube':
        const youtubeService = service as YouTubeService;
        authUrl = youtubeService.generateAuthUrl(state);
        break;
      case 'apple':
        const appleService = service as AppleMusicService;
        authUrl = appleService.generateAuthUrl();
        break;
    }

    return { authUrl, state };
  }

  /**
   * Processa callback OAuth
   */
  async handleOAuthCallback(data: OAuthCallbackData, userId: string): Promise<PlatformAuthResult> {
    // Verificar state
    const stateData = this.verifyState(data.state);
    if (!stateData || stateData.userId !== userId || stateData.platform !== data.platform) {
      throw new Error('Invalid state parameter');
    }

    // Obter serviço da plataforma
    const service = PlatformServiceFactory.create(data.platform);

    // Autenticar com a plataforma
    const authResult = await service.authenticate(data.code);

    // Obter perfil do usuário na plataforma
    const userProfile = await service.getUserProfile(authResult.accessToken);

    // Salvar integração no banco
    await this.prisma.platformIntegration.upsert({
      where: {
        userId_platform: {
          userId,
          platform: data.platform.toUpperCase() as any
        }
      },
      update: {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
        isActive: true,
        userProfile
      },
      create: {
        userId,
        platform: data.platform.toUpperCase() as any,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
        isActive: true,
        userProfile
      }
    });

    return {
      platform: data.platform,
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      expiresIn: authResult.expiresIn,
      userProfile
    };
  }

  /**
   * Revoga acesso a uma plataforma
   */
  async revokePlatformAccess(platform: Platform, userId: string): Promise<void> {
    await this.prisma.platformIntegration.updateMany({
      where: {
        userId,
        platform: platform.toUpperCase() as any
      },
      data: {
        isActive: false
      }
    });
  }

  // ==================== PLATFORM MANAGEMENT ====================

  /**
   * Obtém plataformas conectadas do usuário
   */
  async getUserPlatforms(userId: string): Promise<PlatformIntegration[]> {
    return this.prisma.platformIntegration.findMany({
      where: {
        userId,
        isActive: true
      }
    });
  }

  /**
   * Obtém token de acesso de uma plataforma
   */
  async getPlatformAccessToken(platform: Platform, userId: string): Promise<string | null> {
    const integration = await this.prisma.platformIntegration.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: platform.toUpperCase() as any
        }
      }
    });

    if (!integration || !integration.isActive) {
      return null;
    }

    // Verificar se token expirou
    if (integration.tokenExpiresAt < new Date()) {
      // Tentar renovar token
      try {
        await this.refreshPlatformToken(platform, userId);
        const updatedIntegration = await this.prisma.platformIntegration.findUnique({
          where: {
            userId_platform: {
              userId,
              platform: platform.toUpperCase() as any
            }
          }
        });
        return updatedIntegration?.accessToken || null;
      } catch (error) {
        console.error(`Failed to refresh ${platform} token:`, error);
        return null;
      }
    }

    return integration.accessToken;
  }

  /**
   * Renova token de uma plataforma
   */
  async refreshPlatformToken(platform: Platform, userId: string): Promise<AuthTokens> {
    const integration = await this.prisma.platformIntegration.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: platform.toUpperCase() as any
        }
      }
    });

    if (!integration || !integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    const service = PlatformServiceFactory.create(platform);
    const authResult = await service.refreshToken(integration.refreshToken);

    // Atualizar token no banco
    await this.prisma.platformIntegration.update({
      where: {
        userId_platform: {
          userId,
          platform: platform.toUpperCase() as any
        }
      },
      data: {
        accessToken: authResult.accessToken,
        tokenExpiresAt: new Date(Date.now() + authResult.expiresIn * 1000),
        lastSyncAt: new Date()
      }
    });

    return {
      accessToken: authResult.accessToken,
      refreshToken: integration.refreshToken, // Manter refresh token existente
      expiresIn: authResult.expiresIn
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Gera tokens JWT
   */
  private generateTokens(user: User): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutos em segundos
    };
  }

  /**
   * Valida dados de registro
   */
  private validateRegisterData(data: RegisterData): void {
    if (!data.email || !data.password || !data.name) {
      throw new Error('Email, password, and name are required');
    }

    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (data.name.length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }
  }

  /**
   * Valida credenciais de login
   */
  private validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    if (!this.isValidEmail(credentials.email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Gera state para OAuth
   */
  private generateState(userId: string, platform: Platform): string {
    const stateData = {
      userId,
      platform,
      timestamp: Date.now()
    };

    return Buffer.from(JSON.stringify(stateData)).toString('base64');
  }

  /**
   * Verifica state OAuth
   */
  private verifyState(state: string): { userId: string; platform: Platform; timestamp: number } | null {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      // Verificar se state não é muito antigo (5 minutos)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        return null;
      }

      return stateData;
    } catch (error) {
      return null;
    }
  }
}
