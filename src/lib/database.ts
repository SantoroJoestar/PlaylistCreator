/**
 * 🗄️ Database Configuration
 * 
 * Configurações e utilitários para banco de dados
 * Suporte para diferentes ambientes (dev, test, prod)
 */

import { PrismaClient } from '@prisma/client';

// Configurações por ambiente
const config = {
  development: {
    logQueries: true,
    logErrors: true,
    logWarnings: true,
    errorFormat: 'pretty' as const
  },
  production: {
    logQueries: false,
    logErrors: true,
    logWarnings: false,
    errorFormat: 'minimal' as const
  },
  test: {
    logQueries: false,
    logErrors: true,
    logWarnings: false,
    errorFormat: 'minimal' as const
  }
};

// Função para criar instância do Prisma com configurações específicas
export function createPrismaClient(environment: 'development' | 'production' | 'test' = 'development'): PrismaClient {
  const envConfig = config[environment];
  
  return new PrismaClient({
    log: [
      ...(envConfig.logQueries ? ['query'] : []),
      ...(envConfig.logErrors ? ['error'] : []),
      ...(envConfig.logWarnings ? ['warn'] : [])
    ],
    errorFormat: envConfig.errorFormat
  });
}

// Instância padrão para desenvolvimento
export const prisma = createPrismaClient(process.env.NODE_ENV as any || 'development');

// Funções utilitárias para banco de dados
export const dbUtils = {
  // Verificar conexão
  async checkConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  },

  // Limpar banco de dados (apenas para desenvolvimento/teste)
  async clearDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production');
    }

    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      console.log('✅ Database cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  },

  // Estatísticas do banco
  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        LIMIT 10
      `;
      
      return {
        status: 'healthy',
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date()
      };
    }
  },

  // Backup simples (apenas para desenvolvimento)
  async createBackup(): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Backup not supported in production');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.sql`;
    
    console.log(`📦 Creating backup: ${backupName}`);
    // Em produção, usar pg_dump ou ferramentas específicas
    return backupName;
  }
};

// Middleware para logging de queries (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    
    console.log(`🔍 Query ${params.model}.${params.action} took ${after - before}ms`);
    return result;
  });
}

export default prisma;
