import { Signals } from '../types/adaptive';

/**
 * MODELO DE MAESTRÍA BAYESIANO MEJORADO
 * 
 * Utiliza actualización Bayesiana para estimar el nivel de dominio del estudiante.
 * Basado en: Beta-Binomial Model (IRT - Item Response Theory)
 */
export class BayesianMasteryModel {
  /**
   * Parámetros Beta-Binomial:
   * α (alpha): Éxitos previos observados
   * β (beta): Fracasos previos observados
   */
  private alpha: number = 2;  // Prior débil: esperar 2 éxitos
  private beta: number = 2;   // Prior débil: esperar 2 fracasos

  /**
   * Actualiza estimación de maestría basada en nueva evidencia
   */
  updateMastery(
    currentMu: number,        // Media actual (0-1)
    currentSigma: number,     // Desviación estándar actual
    isCorrect: boolean,
    difficulty: number,       // 0-1
    timeMs: number,
    consistencyScore: number  // 0-100
  ): { newMu: number; newSigma: number; confidence: number } {
    // Peso de actualización basado en dificultad
    const difficultyWeight = 0.3 + (difficulty * 0.7);

    // Peso de actualización basado en tiempo (si fue muy rápido, menos fiable)
    const timeWeight = Math.min(timeMs / 5000, 1.0); // 5s = peso máximo

    // Combinado: consistencia también importa
    const consistencyWeight = (consistencyScore / 100) * 0.3 + 0.7;

    const totalWeight = difficultyWeight * timeWeight * consistencyWeight;

    // Delta: si fue correcto, aumentar; si fue incorrecto, disminuir
    const direction = isCorrect ? 1 : -1;
    const delta = direction * (0.15 * totalWeight);

    const newMu = Math.min(1, Math.max(0, currentMu + delta));

    // La sigma disminuye con más intentos (mayor certidumbre)
    const newSigma = Math.max(0.1, currentSigma - 0.02 * (totalWeight));

    // Confianza: basada en sigma y consistencia
    const confidence = Math.round(
      (1 - newSigma) * 100 * (consistencyWeight)
    );

    return {
      newMu: Math.round(newMu * 1000) / 1000,
      newSigma: Math.round(newSigma * 1000) / 1000,
      confidence
    };
  }

  /**
   * Estima probabilidad de acierto en próximo problema
   * usando modelo IRT (Item Response Theory)
   */
  predictSuccessProbability(
    masteryLevel: number,   // 0-1
    problemDifficulty: number, // 0-1
    discrimination: number = 1.7 // Parámetro IRT típico
  ): number {
    // Modelo logístico IRT: P(θ) = 1 / (1 + e^(-a(θ-b)))
    const theta = masteryLevel - problemDifficulty;
    const exponent = -discrimination * theta;
    const probability = 1 / (1 + Math.exp(exponent));

    return Math.round(probability * 1000) / 1000;
  }

  /**
   * Calcula nivel de confianza en la estimación
   * usando el ancho del intervalo credible
   */
  confidenceInterval(mu: number, sigma: number, confidence: number = 0.95): {
    lower: number;
    upper: number;
    intervalWidth: number;
  } {
    // Z-score para 95%: 1.96
    const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
    const marginOfError = zScore * sigma;

    return {
      lower: Math.max(0, mu - marginOfError),
      upper: Math.min(1, mu + marginOfError),
      intervalWidth: marginOfError * 2
    };
  }

  /**
   * Detección de aprendizaje no lineal (salto súbito)
   */
  detectLearningJump(
    previousMu: number,
    currentMu: number,
    recentAttempts: Array<{ correct: boolean; difficulty: number }>
  ): { isJump: boolean; magnitude: number; reliability: number } {
    const delta = currentMu - previousMu;

    // Un salto es cuando Δμ > 0.25 y hay patrón consistente
    const isLargeJump = Math.abs(delta) > 0.25;

    // Verificar patrón: últimos 5 intentos
    const recentCorrect = recentAttempts.slice(-5).filter(a => a.correct).length;
    const hasConsistentPattern = recentCorrect >= 4; // 4+ de últimos 5

    const isJump = isLargeJump && hasConsistentPattern;
    const reliability = hasConsistentPattern ? 0.85 : 0.5;

    return {
      isJump,
      magnitude: delta,
      reliability
    };
  }
}

/**
 * MODELO DE ACTUALIZACION BAYESIANA CONJUGADO
 * Para parámetros multinomiales
 */
export class ConjugateBayesianUpdater {
  /**
   * Actualiza distribución Dirichlet basada en nueva evidencia
   * Útil para múltiples categorías de errores
   */
  updateDirichlet(
    priorAlpha: number[],  // Prior para cada categoría
    observations: number[] // Recuentos observados
  ): { posteriorAlpha: number[]; probabilities: number[] } {
    // Posterior α = Prior α + observaciones
    const posteriorAlpha = priorAlpha.map((a, i) => a + (observations[i] || 0));

    // Calcular probabilidades desde parámetros Dirichlet
    const sum = posteriorAlpha.reduce((a, b) => a + b, 0);
    const probabilities = posteriorAlpha.map(a => a / sum);

    return { posteriorAlpha, probabilities };
  }
}
