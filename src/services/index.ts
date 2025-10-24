/**
 * 🎵 Services Index - Model Layer
 * 
 * Centraliza todas as exportações dos services
 * Facilita importação e injeção de dependências
 */

// Playlist Services
export { IPlaylistService, PlaylistService } from './playlist/PlaylistService';

// Music Services  
export { IMusicService, MusicService } from './music/MusicService';

// Mood Analysis Services
export { IMoodAnalysisService, MoodAnalysisService } from './mood/MoodAnalysisService';

// Auth Services (próximo passo)
// export { IAuthService, AuthService } from './auth/AuthService';

// Integration Services (próximo passo)
// export { IIntegrationService, IntegrationService } from './integrations/IntegrationService';
