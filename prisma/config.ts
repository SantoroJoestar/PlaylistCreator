/**
 * 🗄️ Prisma Configuration File
 * 
 * Configurações específicas do projeto para Prisma
 */

export default {
  // Configurações de desenvolvimento
  development: {
    logQueries: true,
    logErrors: true,
    logWarnings: true,
    errorFormat: 'pretty'
  },
  
  // Configurações de produção
  production: {
    logQueries: false,
    logErrors: true,
    logWarnings: false,
    errorFormat: 'minimal'
  },
  
  // Configurações de teste
  test: {
    logQueries: false,
    logErrors: true,
    logWarnings: false,
    errorFormat: 'minimal'
  }
};
