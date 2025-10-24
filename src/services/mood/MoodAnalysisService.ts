/**
 * 🧠 Mood Analysis Service - Model Layer
 * 
 * Este service implementa a lógica de negócio para análise de humor:
 * - Processamento de questionários
 * - Algoritmos de análise de humor
 * - Geração de recomendações
 * - Segue Single Responsibility Principle
 */

import { 
  MoodAnalysis, 
  QuestionnaireResponse, 
  PlaylistSuggestion, 
  Mood,
  MoodQuestionnaireData 
} from '@/types';
import { MOOD_CONFIG } from '@/lib/config/platforms';

export interface IMoodAnalysisService {
  analyzeMood(responses: QuestionnaireResponse[]): Promise<MoodAnalysis>;
  generatePlaylistRecommendations(mood: Mood, userId: string): Promise<PlaylistSuggestion[]>;
  getMoodHistory(userId: string, limit?: number): Promise<MoodAnalysis[]>;
  calculateMoodScore(responses: QuestionnaireResponse[]): { mood: Mood; confidence: number };
  getMoodInsights(userId: string): Promise<any>;
}

export class MoodAnalysisService implements IMoodAnalysisService {
  constructor() {}

  /**
   * Analisa humor baseado em respostas do questionário
   */
  async analyzeMood(responses: QuestionnaireResponse[]): Promise<MoodAnalysis> {
    if (!responses || responses.length === 0) {
      throw new Error('Questionnaire responses are required');
    }

    // Calcular humor principal e confiança
    const { mood: primaryMood, confidence } = this.calculateMoodScore(responses);
    
    // Calcular humores secundários
    const secondaryMoods = this.calculateSecondaryMoods(responses);
    
    // Gerar recomendações de gêneros
    const recommendedGenres = this.generateGenreRecommendations(primaryMood, responses);
    
    // Gerar sugestões de playlist
    const playlistSuggestions = await this.generatePlaylistRecommendations(primaryMood, 'user-id');

    const analysis: MoodAnalysis = {
      id: `mood_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'user-id', // Será injetado pelo controller
      primaryMood,
      confidence,
      secondaryMoods,
      questionnaireResponses: responses,
      recommendedGenres,
      playlistSuggestions,
      createdAt: new Date()
    };

    return analysis;
  }

  /**
   * Gera recomendações de playlist baseadas no humor
   */
  async generatePlaylistRecommendations(mood: Mood, userId: string): Promise<PlaylistSuggestion[]> {
    const moodConfig = MOOD_CONFIG[mood];
    
    const suggestions: PlaylistSuggestion[] = [
      {
        name: `${moodConfig.name} Vibes`,
        description: `Uma seleção perfeita para quando você está se sentindo ${moodConfig.name.toLowerCase()}`,
        estimatedDuration: 45,
        mood,
        genres: moodConfig.genres.slice(0, 3),
        songCount: 15
      },
      {
        name: `${moodConfig.name} Deep Dive`,
        description: `Uma jornada musical profunda no mundo do ${moodConfig.name.toLowerCase()}`,
        estimatedDuration: 90,
        mood,
        genres: moodConfig.genres,
        songCount: 30
      },
      {
        name: `${moodConfig.name} Quick Fix`,
        description: `Uma dose rápida de ${moodConfig.name.toLowerCase()} para levantar seu astral`,
        estimatedDuration: 20,
        mood,
        genres: moodConfig.genres.slice(0, 2),
        songCount: 7
      }
    ];

    return suggestions;
  }

  /**
   * Busca histórico de análises de humor do usuário
   */
  async getMoodHistory(userId: string, limit = 10): Promise<MoodAnalysis[]> {
    // Simulação - em produção, buscaria do banco de dados
    const mockHistory: MoodAnalysis[] = [
      {
        id: 'mood_1',
        userId,
        primaryMood: 'happy',
        confidence: 0.85,
        secondaryMoods: ['energetic'],
        questionnaireResponses: [],
        recommendedGenres: ['pop', 'funk'],
        playlistSuggestions: [],
        createdAt: new Date(Date.now() - 86400000) // 1 dia atrás
      },
      {
        id: 'mood_2',
        userId,
        primaryMood: 'calm',
        confidence: 0.72,
        secondaryMoods: ['focused'],
        questionnaireResponses: [],
        recommendedGenres: ['ambient', 'classical'],
        playlistSuggestions: [],
        createdAt: new Date(Date.now() - 172800000) // 2 dias atrás
      }
    ];

    return mockHistory.slice(0, limit);
  }

  /**
   * Calcula score de humor baseado nas respostas
   */
  calculateMoodScore(responses: QuestionnaireResponse[]): { mood: Mood; confidence: number } {
    const moodScores: Record<Mood, number> = {
      happy: 0,
      sad: 0,
      energetic: 0,
      calm: 0,
      romantic: 0,
      focused: 0
    };

    // Processar cada resposta
    responses.forEach(response => {
      const weight = response.weight || 1;
      const answer = response.answer;

      // Mapear respostas para scores de humor
      this.mapAnswerToMoodScores(answer, moodScores, weight);
    });

    // Encontrar humor com maior score
    let maxScore = 0;
    let primaryMood: Mood = 'happy';

    Object.entries(moodScores).forEach(([mood, score]) => {
      if (score > maxScore) {
        maxScore = score;
        primaryMood = mood as Mood;
      }
    });

    // Calcular confiança baseada na diferença entre scores
    const sortedScores = Object.values(moodScores).sort((a, b) => b - a);
    const confidence = sortedScores.length > 1 ? 
      (sortedScores[0] - sortedScores[1]) / sortedScores[0] : 1;

    return {
      mood: primaryMood,
      confidence: Math.min(confidence, 1)
    };
  }

  /**
   * Gera insights sobre padrões de humor do usuário
   */
  async getMoodInsights(userId: string): Promise<any> {
    const history = await this.getMoodHistory(userId, 30);
    
    if (history.length === 0) {
      return {
        message: 'Not enough data for insights',
        recommendations: []
      };
    }

    // Analisar padrões
    const moodFrequency: Record<Mood, number> = {
      happy: 0,
      sad: 0,
      energetic: 0,
      calm: 0,
      romantic: 0,
      focused: 0
    };

    history.forEach(analysis => {
      moodFrequency[analysis.primaryMood]++;
    });

    // Encontrar humor mais comum
    const mostCommonMood = Object.entries(moodFrequency)
      .sort(([,a], [,b]) => b - a)[0][0] as Mood;

    // Calcular tendências
    const recentAnalyses = history.slice(0, 7); // Últimos 7 dias
    const olderAnalyses = history.slice(7, 14); // 7 dias anteriores

    const recentTrend = this.calculateTrend(recentAnalyses);
    const olderTrend = this.calculateTrend(olderAnalyses);

    return {
      totalAnalyses: history.length,
      mostCommonMood,
      moodFrequency,
      trend: {
        recent: recentTrend,
        older: olderTrend,
        direction: recentTrend > olderTrend ? 'improving' : 'declining'
      },
      recommendations: this.generateInsightRecommendations(mostCommonMood, recentTrend)
    };
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Mapeia resposta para scores de humor
   */
  private mapAnswerToMoodScores(answer: string | number, scores: Record<Mood, number>, weight: number): void {
    const answerStr = answer.toString().toLowerCase();

    // Mapeamento baseado em palavras-chave
    const moodKeywords: Record<Mood, string[]> = {
      happy: ['feliz', 'alegre', 'contente', 'animado', 'positivo', 'otimista'],
      sad: ['triste', 'melancólico', 'deprimido', 'chateado', 'desanimado'],
      energetic: ['energético', 'animado', 'agitado', 'ativo', 'dinâmico'],
      calm: ['calmo', 'relaxado', 'tranquilo', 'sereno', 'pacifico'],
      romantic: ['romântico', 'apaixonado', 'carinhoso', 'amoroso'],
      focused: ['focado', 'concentrado', 'atento', 'determinado']
    };

    Object.entries(moodKeywords).forEach(([mood, keywords]) => {
      if (keywords.some(keyword => answerStr.includes(keyword))) {
        scores[mood as Mood] += weight;
      }
    });

    // Mapeamento baseado em valores numéricos (escala 1-10)
    if (typeof answer === 'number') {
      if (answer >= 8) {
        scores.happy += weight * 0.5;
        scores.energetic += weight * 0.3;
      } else if (answer <= 3) {
        scores.sad += weight * 0.5;
        scores.calm += weight * 0.3;
      } else if (answer >= 6) {
        scores.happy += weight * 0.3;
        scores.focused += weight * 0.2;
      } else {
        scores.calm += weight * 0.3;
        scores.focused += weight * 0.2;
      }
    }
  }

  /**
   * Calcula humores secundários
   */
  private calculateSecondaryMoods(responses: QuestionnaireResponse[]): Mood[] {
    const { mood: primaryMood } = this.calculateMoodScore(responses);
    
    // Simulação - em produção, calcularia baseado nos scores
    const secondaryMoods: Mood[] = [];
    
    if (primaryMood === 'happy') {
      secondaryMoods.push('energetic');
    } else if (primaryMood === 'sad') {
      secondaryMoods.push('calm');
    } else if (primaryMood === 'energetic') {
      secondaryMoods.push('happy');
    }
    
    return secondaryMoods;
  }

  /**
   * Gera recomendações de gêneros
   */
  private generateGenreRecommendations(mood: Mood, responses: QuestionnaireResponse[]): string[] {
    const moodConfig = MOOD_CONFIG[mood];
    let genres = [...moodConfig.genres];

    // Personalizar baseado nas respostas
    responses.forEach(response => {
      if (response.question.includes('gênero') || response.question.includes('estilo')) {
        const answer = response.answer.toString().toLowerCase();
        
        // Adicionar gêneros mencionados nas respostas
        const musicGenres = ['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop', 'country', 'blues'];
        musicGenres.forEach(genre => {
          if (answer.includes(genre) && !genres.includes(genre)) {
            genres.push(genre);
          }
        });
      }
    });

    return genres.slice(0, 5); // Limitar a 5 gêneros
  }

  /**
   * Calcula tendência de humor
   */
  private calculateTrend(analyses: MoodAnalysis[]): number {
    if (analyses.length === 0) return 0;

    const moodValues: Record<Mood, number> = {
      happy: 1,
      energetic: 0.8,
      romantic: 0.6,
      focused: 0.4,
      calm: 0.2,
      sad: 0
    };

    const totalScore = analyses.reduce((sum, analysis) => {
      return sum + (moodValues[analysis.primaryMood] * analysis.confidence);
    }, 0);

    return totalScore / analyses.length;
  }

  /**
   * Gera recomendações baseadas em insights
   */
  private generateInsightRecommendations(mostCommonMood: Mood, trend: number): string[] {
    const recommendations: string[] = [];

    if (trend < 0.3) {
      recommendations.push('Considere explorar músicas mais animadas para melhorar seu humor');
    }

    if (mostCommonMood === 'sad') {
      recommendations.push('Que tal experimentar playlists de música clássica ou ambient para relaxar?');
    }

    if (mostCommonMood === 'energetic') {
      recommendations.push('Você parece gostar de músicas energéticas! Explore mais rock e electronic');
    }

    recommendations.push('Continue usando nossa análise de humor para descobrir novos estilos musicais');

    return recommendations;
  }
}
