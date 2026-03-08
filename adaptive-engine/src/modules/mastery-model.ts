import { MasteryState, UnlockResult, SkillCriticality } from '../types/mastery';
import { UNLOCK_THRESHOLDS } from '../config/thresholds';
import { ErrorClassification } from '../types/errors';

export class MasteryModel {
  private mu: number = 0.50;        // Prior: 50% incertidumbre
  private sigma: number = 0.30;

  constructor(initialState?: MasteryState) {
    if (initialState) {
      this.mu = initialState.mu;
      this.sigma = initialState.sigma;
    }
  }

  /**
   * Actualiza mastery con modelo Bayesiano
   * después de que estudiante completa ejercicio
   * 
   * P(mastery | ejercicio) = P(ejercicio | mastery) * P(mastery) / P(ejercicio)
   */
  updateMastery(
    isCorrect: boolean,
    difficulty: number,          // 1-10
    errorClassification?: ErrorClassification
  ): MasteryState {
    // Paso 1 y 2: Actualizar media (posterior) integrada con likelihood
    const posteriorMu = this.updateMu(isCorrect, difficulty);

    // Paso 3: Actualizar incertidumbre (sigma decay)
    const posteriorSigma = this.updateSigma(isCorrect, errorClassification);

    // Actualizar estado
    this.mu = posteriorMu;
    this.sigma = posteriorSigma;

    return this.getState();
  }

  /**
   * Calcula P(correcto | mastery) y P(correcto | ~mastery)
   */
  private getLikelihoods(difficulty: number) {
    // Ajuste dinámico de Slip y Guess basado en dificultad (1-10)
    const normalizedDiff = (difficulty - 5) / 10; // -0.4 to 0.5
    const slip = Math.max(0.05, Math.min(0.5, 0.10 + normalizedDiff * 0.1));
    const guess = Math.max(0.05, Math.min(0.5, 0.20 - normalizedDiff * 0.1));
    return { slip, guess };
  }

  /**
   * Actualización de media con Bayes
   */
  private updateMu(isCorrect: boolean, difficulty: number): number {
    const { slip, guess } = this.getLikelihoods(difficulty);
    
    let posteriorMu;
    if (isCorrect) {
      // P(M|Correct) = P(Correct|M) * P(M) / P(Correct)
      const pCorrect = (1 - slip) * this.mu + guess * (1 - this.mu);
      posteriorMu = ((1 - slip) * this.mu) / pCorrect;
    } else {
      // P(M|Incorrect) = P(Incorrect|M) * P(M) / P(Incorrect)
      const pIncorrect = slip * this.mu + (1 - guess) * (1 - this.mu);
      posteriorMu = (slip * this.mu) / pIncorrect;
    }
    return posteriorMu;
  }

  /**
   * Actualización de sigma (incertidumbre)
   * 
   * Generalmente disminuye con cada ejercicio (sabemos más)
   * Pero aumenta si hay inconsistencia (respuestas erráticas)
   */
  private updateSigma(
    isCorrect: boolean,
    errorClassification?: ErrorClassification
  ): number {
    // Base: reducción natural en incertidumbre
    let newSigma = this.sigma * 0.95; // 5% decay

    // Si error es CONCEPTUAL, aumentar sigma
    // (indica que no entendemos realmente)
    if (errorClassification?.category === 'CONCEPTUAL') {
      newSigma = Math.min(newSigma + 0.10, this.sigma); // Aumentar pero con límite
    }

    return Math.max(newSigma, 0.05); // Mínimo: 5%
  }

  /**
   * Obtiene estado actual de mastery
   */
  getState(): MasteryState {
    return {
      skillId: '',  // Se asigna desde afuera
      mu: this.mu,
      sigma: this.sigma,
      estimatedMastery: Math.round(this.mu * 100),
      confidence: Math.max(0, Math.round((1 - this.sigma) * 100)),
      attemptCount: 0, // Se maneja externamente
      lastPracticeDate: new Date(),
      status: this.determineStatus()
    };
  }

  /**
   * Verifica si skill debería desbloquearse
   */
  checkUnlock(criticality: SkillCriticality, attemptCount: number): UnlockResult {
    const threshold = UNLOCK_THRESHOLDS[criticality];

    const gaps: string[] = [];

    if (this.mu * 100 < threshold.mastery) {
      gaps.push(`Mastery: ${Math.round(this.mu * 100)}% < ${threshold.mastery}%`);
    }

    if ((1 - this.sigma) * 100 < threshold.confidence) {
      gaps.push(`Confidence: ${Math.round((1 - this.sigma) * 100)}% < ${threshold.confidence}%`);
    }

    if (attemptCount < threshold.minAttempts) {
      gaps.push(`Intentos: ${attemptCount} < ${threshold.minAttempts}`);
    }

    return {
      shouldUnlock: gaps.length === 0,
      reason: gaps.length === 0 
        ? `Skill dominado (${criticality})`
        : `Faltan: ${gaps.join(', ')}`,
      gaps
    };
  }

  /**
   * Calcula riesgo de olvido (exponential decay)
   * Basado en Ebbinghaus
   */
  calculateRetentionRisk(daysSincePractice: number): number {
    const halfLifeDays = 14;
    const risk = 100 * (1 - Math.exp(-daysSincePractice / halfLifeDays));
    return Math.min(Math.round(risk), 100);
  }

  private determineStatus(): 'locked' | 'in_progress' | 'unlocked' | 'mastered' {
    if (this.mu < 0.30) return 'locked';
    if (this.mu < 0.70) return 'in_progress';
    if (this.mu < 0.90) return 'unlocked';
    return 'mastered';
  }
}
