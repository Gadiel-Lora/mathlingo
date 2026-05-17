/**
 * MODELO DE RETENCIÓN BASADO EN EBBINGHAUS + SM-2
 * 
 * Combina:
 * - Curva de olvido de Ebbinghaus: R(t) = e^(-t/S)
 * - Algoritmo SM-2 (SuperMemo): incremento dinámico de intervalo
 */
export class AdvancedRetentionModel {
  /**
   * Fuerza de memoria (S): medida de cuánto tiempo la información se retiene
   * Valor por defecto: ~14 días (para mayor precisión)
   */
  private defaultStrength: number = 14;

  /**
   * Calcula probabilidad de retención según Ebbinghaus
   */
  calculateRetentionProbability(
    daysSincePractice: number,
    strengthOfMemory: number = this.defaultStrength
  ): number {
    // R(t) = e^(-t/S) donde t = días, S = fuerza
    const retentionProb = Math.exp(-daysSincePractice / strengthOfMemory);

    // Clamp a [0, 1]
    return Math.max(0, Math.min(1, retentionProb));
  }

  /**
   * Calcula "forgetting index": probabilidad de olvidar
   */
  calculateForgetIndex(
    daysSincePractice: number,
    strengthOfMemory: number = this.defaultStrength,
    confidenceScore: number = 0.5
  ): number {
    const retentionProb = this.calculateRetentionProbability(daysSincePractice, strengthOfMemory);
    const forgetIndex = 1 - retentionProb;

    // Ajustar por confianza: más confianza = menos olvido probable
    const adjustedForget = forgetIndex * (1 - confidenceScore * 0.3);

    return Math.round(adjustedForget * 10000) / 10000;
  }

  /**
   * SM-2: Calcula próximo intervalo de revisión
   * 
   * El algoritmo SM-2 incrementa el intervalo exponencialmente si el estudiante
   * responde correctamente, con factor de repetición.
   */
  calculateNextIntervalSM2(
    previousInterval: number,        // días
    repetitionCount: number,         // cuántas veces se ha revisado correctamente
    quality: number                  // 0-5: calidad de la respuesta (0=olvido, 5=perfecto)
  ): { nextInterval: number; easeFactor: number } {
    // SM-2: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
    const easeFactorAdjustment = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);

    // Ease factor inicial: 2.5, mínimo: 1.3
    const baseFactor = Math.max(1.3, 2.5 + easeFactorAdjustment);

    let nextInterval: number;

    if (repetitionCount === 1) {
      nextInterval = 1;        // Primer repaso: 1 día
    } else if (repetitionCount === 2) {
      nextInterval = 3;        // Segundo repaso: 3 días
    } else {
      // Tercero en adelante: Previous × EF
      nextInterval = Math.round(previousInterval * baseFactor);
    }

    return {
      nextInterval: Math.min(nextInterval, 365),  // Máximo 1 año
      easeFactor: baseFactor
    };
  }

  /**
   * Algoritmo LEITNER optimizado: Distribución en cajas según retención
   * 
   * Las tarjetas (skills) se distribuyen en cajas (niveles).
   * Las cajas más altas = mayor intervalo de revisión.
   */
  calculateLeitnerBox(
    forgetIndex: number,              // 0-1: probabilidad de olvidar
    currentBox: number = 1,           // 1-5
    consecutiveCorrect: number = 0
  ): { nextBox: number; reviewIntervalDays: number } {
    // Intervalos de revisión por caja (días)
    const boxIntervals = [1, 3, 7, 14, 30];

    if (forgetIndex > 0.7) {
      // Riesgo muy alto: vuelve a caja 1
      return { nextBox: 1, reviewIntervalDays: boxIntervals[0] };
    }

    if (forgetIndex > 0.4) {
      // Riesgo moderado: mantén caja actual o baja
      const nextBox = Math.max(1, currentBox - 1);
      return { nextBox, reviewIntervalDays: boxIntervals[nextBox - 1] };
    }

    // Bajo riesgo: Avanza de caja si hay correctos consecutivos
    if (consecutiveCorrect >= 3 && currentBox < 5) {
      return { nextBox: currentBox + 1, reviewIntervalDays: boxIntervals[currentBox] };
    }

    return { nextBox: currentBox, reviewIntervalDays: boxIntervals[currentBox - 1] };
  }

  /**
   * Calcular "due score" para priorizar revisiones
   * Combina: forgetIndex + tiempo desde última revisión + importancia
   */
  calculateDueScore(
    forgetIndex: number,
    daysSincePractice: number,
    criticality: number = 1.0    // 1 = normal, 2 = crítico
  ): number {
    // Componentes:
    const forgetComponent = forgetIndex * 100 * criticality;
    const timeComponent = Math.sqrt(daysSincePractice) * 5 * criticality;
    const urgencyBoost = daysSincePractice > 30 ? 20 : 0;

    return Math.round(forgetComponent + timeComponent + urgencyBoost);
  }

  /**
   * Recomendación de cuándo revisar (en minutos)
   */
  recommendReviewTiming(forgetIndex: number): { minutesUntilReview: number; urgency: string } {
    let minutesUntilReview: number;
    let urgency: string;

    if (forgetIndex > 0.8) {
      minutesUntilReview = 15;      // Inmediato
      urgency = 'CRITICAL';
    } else if (forgetIndex > 0.6) {
      minutesUntilReview = 60;      // Hoy
      urgency = 'HIGH';
    } else if (forgetIndex > 0.4) {
      minutesUntilReview = 24 * 60; // Mañana
      urgency = 'MEDIUM';
    } else if (forgetIndex > 0.2) {
      minutesUntilReview = 7 * 24 * 60; // Próxima semana
      urgency = 'LOW';
    } else {
      minutesUntilReview = 30 * 24 * 60; // Próximo mes
      urgency = 'MINIMAL';
    }

    return { minutesUntilReview, urgency };
  }

  /**
   * Calcular distribución óptima de práctica (Desirable Difficulty)
   * Baseado en Bjork & Bjork: "desirable difficulty"
   */
  calculateOptimalDifficulty(
    masteryLevel: number,          // 0-1
    consecutiveCorrect: number,
    consecutiveIncorrect: number
  ): { recommendedDifficulty: number; explanation: string } {
    // Si el estudiante está muy exitoso: aumenta dificultad
    if (consecutiveCorrect >= 5 && masteryLevel > 0.7) {
      return {
        recommendedDifficulty: Math.min(1, masteryLevel + 0.2),
        explanation: 'Aumentar dificultad: estudiante muy exitoso'
      };
    }

    // Si hay fracasos: disminuye dificultad ligeramente
    if (consecutiveIncorrect >= 3) {
      return {
        recommendedDifficulty: Math.max(0.3, masteryLevel - 0.15),
        explanation: 'Disminuir dificultad: múltiples fallos'
      };
    }

    // Óptimo: mantener dificultad ~70-80% correcta (Desirable Difficulty)
    return {
      recommendedDifficulty: masteryLevel,
      explanation: 'Mantener dificultad deseable (~75% correcta)'
    };
  }
}

/**
 * MODELO DE TRANSFERENCIA LATERAL
 * Detecta cuándo una skill ayuda a otra (transferencia positiva)
 */
export class TransferLearningModel {
  /**
   * Estima ganancia de transferencia de skill A a skill B
   */
  estimateTransferBenefit(
    masteryA: number,        // Nivel de dominio de skill A
    similarity: number,      // 0-1: cuán similar es B a A
    prerequisiteDepth: number // 0-1: cuán fundamental es A para B
  ): number {
    // Beneficio = masteryA × similarity × prerequisiteDepth
    const baseBenefit = masteryA * similarity * prerequisiteDepth;

    // Pero hay rendimientos decrecientes
    const diminishingReturn = Math.sqrt(baseBenefit);

    return Math.round(diminishingReturn * 100);
  }

  /**
   * Actualizar maestría de B teniendo en cuenta dominio de A (transferencia)
   */
  adjustMasteryWithTransfer(
    estimatedMasteryB: number,
    transferBenefit: number
  ): number {
    // La transferencia añade mejora, pero con factor de débil
    const transferBoost = transferBenefit * 0.01 * 0.5; // 50% de eficiencia

    return Math.min(1, estimatedMasteryB + transferBoost);
  }
}
