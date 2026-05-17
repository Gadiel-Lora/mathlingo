/**
 * DETECCIÓN AVANZADA DE PATRONES DE ERROR
 * 
 * Utiliza:
 * - Análisis de secuencias (Markov chains)
 * - Clustering de errores
 * - Predicción de errores futuros
 */

export enum ErrorPattern {
  RANDOM = 'RANDOM',              // Errores sin patrón (proceso aleatorio)
  SYSTEMATIC = 'SYSTEMATIC',      // Errores repetidos en el mismo error
  LEARNING = 'LEARNING',          // Mejora gradual
  OSCILLATING = 'OSCILLATING',    // Alterna correcto/incorrecto
  DETERIORATING = 'DETERIORATING' // Empeora con el tiempo
}

export class AdvancedErrorPatternDetector {
  /**
   * Detecta patrón de errores usando cadena de Markov
   */
  detectErrorPattern(
    recentAttempts: Array<{ correct: boolean; timestamp: number }>
  ): { pattern: ErrorPattern; confidence: number; details: string } {
    if (recentAttempts.length < 5) {
      return {
        pattern: ErrorPattern.RANDOM,
        confidence: 0.3,
        details: 'Pocos intentos para conclusión'
      };
    }

    const windowSize = Math.min(recentAttempts.length, 15);
    const window = recentAttempts.slice(-windowSize);

    // Convertir a secuencia binaria
    const sequence = window.map(a => a.correct ? 1 : 0);

    // Calcular estadísticas
    const stats = this.analyzeSequence(sequence);

    if (stats.entropy < 0.3) {
      // Baja entropía = patrón predecible
      return {
        pattern: ErrorPattern.SYSTEMATIC,
        confidence: 0.9,
        details: `Patrón predecible: ${this.describePattern(sequence)}`
      };
    }

    if (stats.trend > 0.1) {
      return {
        pattern: ErrorPattern.LEARNING,
        confidence: Math.min(0.95, 0.5 + stats.trend),
        details: `Mejora gradual (trend: ${stats.trend.toFixed(2)})`
      };
    }

    if (stats.trend < -0.1) {
      return {
        pattern: ErrorPattern.DETERIORATING,
        confidence: Math.min(0.95, 0.5 - stats.trend),
        details: `Empeoramiento (trend: ${stats.trend.toFixed(2)})`
      };
    }

    if (stats.oscillation > 0.6) {
      return {
        pattern: ErrorPattern.OSCILLATING,
        confidence: 0.8,
        details: `Oscilación entre correctas e incorrectas`
      };
    }

    return {
      pattern: ErrorPattern.RANDOM,
      confidence: 0.5,
      details: 'Patrón aleatorio o inconsistente'
    };
  }

  /**
   * Analiza secuencia binaria
   */
  private analyzeSequence(sequence: number[]): {
    entropy: number;
    trend: number;
    oscillation: number;
  } {
    // Entropía: -Σ p log p (medida de aleatoriedad)
    const ones = sequence.filter(x => x === 1).length;
    const zeros = sequence.length - ones;
    const p1 = ones / sequence.length;
    const p0 = zeros / sequence.length;

    const entropy =
      -(p1 > 0 ? p1 * Math.log2(p1) : 0) -
      (p0 > 0 ? p0 * Math.log2(p0) : 0);

    // Trend: pendiente de regresión lineal
    const n = sequence.length;
    const sumX = (n * (n - 1)) / 2;
    const sumXY = sequence.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * sumXY - sumX * ones) / (n * sumX2 - sumX * sumX);

    // Oscillation: cambios de signo
    const changes = sequence.reduce((count, val, i) => {
      return count + (i > 0 && val !== sequence[i - 1] ? 1 : 0);
    }, 0);
    const oscillation = changes / (sequence.length - 1);

    return {
      entropy: Math.min(1, entropy), // Normalizado a [0, 1]
      trend: slope,
      oscillation
    };
  }

  /**
   * Describe patrón de forma legible
   */
  private describePattern(sequence: number[]): string {
    // Buscar patrón repetitivo
    for (let len = 1; len <= sequence.length / 2; len++) {
      const pattern = sequence.slice(0, len);
      const repeating = sequence.slice(len).every((val, i) => val === pattern[i % len]);

      if (repeating) {
        return `Patrón repetitivo: ${pattern.join('')}`;
      }
    }

    return 'Patrón no identificable';
  }

  /**
   * Predice probabilidad del próximo error
   */
  predictNextErrorProbability(
    recentAttempts: Array<{ correct: boolean }>,
    errorPattern: ErrorPattern
  ): number {
    const correctCount = recentAttempts.filter(a => a.correct).length;
    const totalCount = recentAttempts.length;
    const empiricalErrorRate = 1 - correctCount / totalCount;

    const patternAdjustment = {
      [ErrorPattern.RANDOM]: 0,         // Sin ajuste
      [ErrorPattern.SYSTEMATIC]: 0.3,   // Muy probable continúe error
      [ErrorPattern.LEARNING]: -0.15,   // Mejorando
      [ErrorPattern.OSCILLATING]: 0.1,  // Ligeramente errático
      [ErrorPattern.DETERIORATING]: 0.25 // Empeorando
    };

    const predicted = empiricalErrorRate + patternAdjustment[errorPattern];
    return Math.min(1, Math.max(0, predicted));
  }
}

/**
 * CLUSTERING DE ERRORES
 * Agrupa errores similares para identificar conceptos problemáticos
 */
export class ErrorClustering {
  /**
   * Agrupa errores por tipo y contexto
   */
  clusterErrors(
    errors: Array<{
      errorType: string;
      context: string;
      difficulty: number;
    }>
  ): Map<string, Array<any>> {
    const clusters = new Map<string, Array<any>>();

    for (const error of errors) {
      const key = `${error.errorType}:${error.context}`;
      const cluster = clusters.get(key) || [];
      cluster.push(error);
      clusters.set(key, cluster);
    }

    return clusters;
  }

  /**
   * Calcula prevalencia: qué errores son más comunes
   */
  calculateErrorPrevalence(
    errorClusters: Map<string, Array<any>>
  ): Array<{ errorType: string; prevalence: number }> {
    const total = Array.from(errorClusters.values()).reduce((sum, c) => sum + c.length, 0);

    return Array.from(errorClusters.entries())
      .map(([key, cluster]) => ({
        errorType: key,
        prevalence: cluster.length / total
      }))
      .sort((a, b) => b.prevalence - a.prevalence);
  }

  /**
   * Detecta "error crítico": tipo de error que bloquea todo el progreso
   */
  identifyCriticalErrorType(
    errorClusters: Map<string, Array<any>>,
    masteryThreshold: number = 0.6
  ): string | null {
    const prevalence = this.calculateErrorPrevalence(errorClusters);

    // Si un error ocurre en >40% de fallos, es crítico
    const critical = prevalence.find(e => e.prevalence > 0.4);

    return critical ? critical.errorType : null;
  }
}

/**
 * MODELO DE TRANSFERENCIA DE CONOCIMIENTO
 * Detecta cuándo un error en una skill se debe a conceptos de otra skill
 */
export class CrossSkillErrorAnalysis {
  /**
   * Analiza si el error es debido a debilidad en prerequisito
   */
  analyzePrerequisiteContribution(
    errorType: string,
    skillInQuestion: string,
    prerequisites: string[],
    masteryBySkill: Map<string, number>
  ): { contributingSkills: string[]; probability: number } {
    const contributingSkills: string[] = [];

    // Mapeo: tipo de error → skills que lo causan
    const errorToPrereqs: Record<string, string[]> = {
      'ARITHMETIC': ['basic-operations'],
      'ORDER_OF_OPERATIONS': ['basic-operations', 'order-precedence'],
      'VARIABLE_ISOLATION': ['algebraic-manipulation', 'inverse-operations'],
      'FRACTION_OPERATIONS': ['fractions', 'equivalent-forms'],
    };

    const relatedPrereqs = errorToPrereqs[errorType] || [];

    for (const prereq of relatedPrereqs) {
      if (prerequisites.includes(prereq)) {
        const masteryLevel = masteryBySkill.get(prereq) || 0;
        if (masteryLevel < 0.7) {
          contributingSkills.push(prereq);
        }
      }
    }

    // Probabilidad de que el error sea causado por prerequisito débil
    const probability = Math.min(
      1,
      contributingSkills.length * 0.4 // Cada skill contribuye 40%
    );

    return { contributingSkills, probability };
  }
}
