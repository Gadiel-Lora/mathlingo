import { Recommendation, RecommendationType, Signals } from '../types/adaptive';

/**
 * THOMPSON SAMPLING PARA RECOMENDACIONES ADAPTATIVAS
 * 
 * Problema: Cómo elegir entre explorar (probar nuevas skills) vs explotar (practicar actual).
 * Solución: Thompson Sampling = muestreo probabilístico desde distribuciones Bayesianas.
 */
export class ThompsonSamplingRecommender {
  /**
   * Para cada skill, mantenemos:
   * - successCount: éxitos observados
   * - failureCount: fracasos observados
   */
  private skillStats: Map<string, { successes: number; failures: number }> = new Map();

  /**
   * Recomendador principal: Thompson Sampling
   */
  recommendSkillUsingThompsonSampling(
    availableSkills: Array<{
      id: string;
      name: string;
      difficulty: number;
      masteryLevel: number;
    }>,
    currentSkillId: string,
    signals: Signals,
    explorationRate: number = 0.15
  ): Recommendation {
    // Muestrear tasa de éxito estimada para cada skill usando Thompson Sampling
    const sampledSuccessRates = availableSkills.map(skill => ({
      skill,
      sampledSuccessRate: this.sampleBetaDistribution(skill.id),
      expectedValue: this.calculateExpectedValue(skill, signals)
    }));

    // Ordenar por tasa muestreada (Thompson Sampling: max)
    sampledSuccessRates.sort((a, b) => b.sampledSuccessRate - a.sampledSuccessRate);

    // Con probabilidad explorationRate, elegir skill random (exploración)
    const shouldExplore = Math.random() < explorationRate;
    const selectedSkill = shouldExplore
      ? availableSkills[Math.floor(Math.random() * availableSkills.length)]
      : sampledSuccessRates[0].skill;

    // Determinar tipo de recomendación
    const type = this.determineRecommendationType(
      selectedSkill,
      signals,
      selectedSkill.masteryLevel
    );

    return {
      type,
      contentId: selectedSkill.id,
      lessonType: this.mapToLessonType(type),
      reason: `Thompson Sampling recomienda: ${selectedSkill.name}`,
      confidence: Math.round(sampledSuccessRates[0].sampledSuccessRate * 100),
      suggestedActions: this.suggestActions(signals, selectedSkill.masteryLevel)
    };
  }

  /**
   * Muestreo de distribución Beta
   * Basado en observaciones previas de éxito/fracaso
   */
  private sampleBetaDistribution(skillId: string): number {
    const stats = this.skillStats.get(skillId) || { successes: 2, failures: 2 };

    // Muestrear de Beta(α + successes, β + failures)
    // Usamos aproximación: generar dos uniformes y transformar
    const u1 = Math.random();
    const u2 = Math.random();

    // Transformación Box-Muller para aproximar Beta
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Normalizar a [0, 1]
    const alpha = stats.successes;
    const beta = stats.failures;
    const mean = alpha / (alpha + beta);

    // Añadir varianza controlada
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);

    const sample = mean + z0 * stdDev;
    return Math.min(1, Math.max(0, sample));
  }

  /**
   * Actualizar con resultado observado (learning)
   */
  recordSkillOutcome(skillId: string, wasSuccessful: boolean): void {
    const current = this.skillStats.get(skillId) || { successes: 0, failures: 0 };

    if (wasSuccessful) {
      current.successes += 1;
    } else {
      current.failures += 1;
    }

    this.skillStats.set(skillId, current);
  }

  /**
   * Calcular valor esperado multi-objetivo
   */
  private calculateExpectedValue(
    skill: { difficulty: number; masteryLevel: number },
    signals: Signals
  ): number {
    // Factores:
    // 1. Ganancia de información: sqrt(1 - masteryLevel)
    // 2. Adecuación de dificultad: 1 - |skill.difficulty - signals.accuracy/100|
    // 3. Urgencia de retención: 1 - (signals.retentionRisk / 100)

    const informationGain = Math.sqrt(1 - skill.masteryLevel);
    const difficultyFit = 1 - Math.abs(skill.difficulty - signals.accuracy / 100);
    const retentionUrgency = 1 - signals.retentionRisk / 100;

    // Pesos: exploración + personalización + retención
    return (
      informationGain * 0.4 +
      difficultyFit * 0.4 +
      retentionUrgency * 0.2
    );
  }

  /**
   * Determinar tipo de recomendación según contexto
   */
  private determineRecommendationType(
    skill: { difficulty: number; masteryLevel: number },
    signals: Signals,
    masteryLevel: number
  ): RecommendationType {
    if (signals.retentionRisk > 75) {
      return RecommendationType.SPACED_REPETITION;
    }

    if (masteryLevel < 0.65) {
      if (signals.predictedFailure > 75) {
        return RecommendationType.REFUERZO_CONCEPTUAL;
      }
      return RecommendationType.REFUERZO_PRÁCTICA;
    }

    if (signals.accuracy > 88 && signals.consistency > 85) {
      return RecommendationType.DESAFÍO_OPCIONAL;
    }

    return RecommendationType.NEXT_LESSON;
  }

  private mapToLessonType(type: RecommendationType): string {
    const mapping: Record<RecommendationType, string> = {
      [RecommendationType.NEXT_LESSON]: 'next_lesson',
      [RecommendationType.REFUERZO_PRÁCTICA]: 'practice_set',
      [RecommendationType.REFUERZO_CONCEPTUAL]: 'mini_lesson_reexplanation',
      [RecommendationType.DESAFÍO_OPCIONAL]: 'challenge_problem',
      [RecommendationType.SPACED_REPETITION]: 'spaced_repetition',
      [RecommendationType.REFUERZO_BLOQUEANTE]: 'mandatory_practice'
    };
    return mapping[type] || 'next_lesson';
  }

  private suggestActions(signals: Signals, masteryLevel: number): string[] {
    const actions: string[] = [];

    if (signals.accuracy < 60) {
      actions.push('Revisa los conceptos fundamentales');
    }
    if (signals.consistency < 50) {
      actions.push('Intenta ser más consistente en tu enfoque');
    }
    if (signals.retentionRisk > 75) {
      actions.push('Repasa habilidades anteriores (spaced repetition)');
    }

    return actions.length > 0 ? actions : ['Continúa con el siguiente ejercicio'];
  }

  /**
   * Info sobre distribución posterior (para debugging)
   */
  getSkillStats(skillId: string): { successes: number; failures: number; estimatedSuccessRate: number } {
    const stats = this.skillStats.get(skillId) || { successes: 2, failures: 2 };
    const total = stats.successes + stats.failures;
    const estimatedSuccessRate = stats.successes / total;

    return { ...stats, estimatedSuccessRate };
  }
}

/**
 * MULTI-ARMED BANDIT PARA RECOMENDACIONES
 * Alternativa más simple a Thompson Sampling: Upper Confidence Bound (UCB)
 */
export class UCBRecommender {
  private skillStats: Map<string, { successes: number; trials: number }> = new Map();

  /**
   * UCB = mean + c * sqrt(ln(N) / n)
   * Balancea explotación (mean alta) con exploración (incertidumbre alta)
   */
  recommendSkillUsingUCB(
    availableSkills: string[],
    explorationConstant: number = 1.414
  ): string {
    const totalTrials = Array.from(this.skillStats.values()).reduce((sum, s) => sum + s.trials, 0);

    const ucbScores = availableSkills.map(skillId => {
      const stats = this.skillStats.get(skillId) || { successes: 0, trials: 1 };
      const mean = stats.successes / stats.trials;
      const uncertainty = explorationConstant * Math.sqrt(Math.log(totalTrials) / stats.trials);
      return {
        skillId,
        ucbScore: mean + uncertainty
      };
    });

    ucbScores.sort((a, b) => b.ucbScore - a.ucbScore);
    return ucbScores[0].skillId;
  }

  recordOutcome(skillId: string, wasSuccessful: boolean): void {
    const stats = this.skillStats.get(skillId) || { successes: 0, trials: 0 };
    stats.trials += 1;
    if (wasSuccessful) stats.successes += 1;
    this.skillStats.set(skillId, stats);
  }
}
