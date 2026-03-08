import { Signals } from '../types/adaptive';

export class SignalsCalculator {
  /**
   * Calcula todas las señales necesarias para recomendación
   */
  async calculateSignals(
    studentId: string,
    skillId: string,
    lastExerciseResult: {
      isCorrect: boolean;
      difficulty: number;
      timeMs: number;
      errorClassification?: any;
    },
    studentStateDb: any  // Interface a base de datos mock
  ): Promise<Signals> {
    // Accuracy: últimas 5 respuestas
    const accuracy = await this.getAccuracyLastN(studentStateDb, studentId, skillId, 5);

    // Consistency: estabilidad en últimas 20 respuestas
    const consistency = await this.getConsistency(studentStateDb, studentId, skillId);

    // Retention risk: decay exponencial
    const skillState = await studentStateDb.getUserSkillState(studentId, skillId);
    let retentionRisk = 0;
    let daysSincePractice = 0;
    if (skillState?.lastPracticeDate) {
        daysSincePractice = (Date.now() - skillState.lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24);
        retentionRisk = 100 * (1 - Math.exp(-daysSincePractice / 14));
    }

    // Predicted failure: basado en patrón de errores + consistency
    const predictedFailure = await this.predictFailureRisk(
      studentId,
      skillId,
      accuracy,
      consistency
    );

    // Learning velocity: velocidad promedio de dominio
    const learningVelocity = await this.getLearningVelocity(
      studentStateDb,
      studentId
    );

    // Mastery confidence: basado en número de intentos + recencia
    const masteryConfidence = this.calculateMasteryConfidence(
      skillState?.attemptCount || 0,
      daysSincePractice,
      consistency
    );

    return {
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      errorType: lastExerciseResult.errorClassification?.category,
      retentionRisk: Math.min(Math.round(retentionRisk), 100),
      predictedFailure: Math.round(predictedFailure),
      learningVelocity,
      masteryConfidence: Math.round(masteryConfidence)
    };
  }

  private async getAccuracyLastN(
    db: any,
    studentId: string,
    skillId: string,
    n: number
  ): Promise<number> {
    const attempts = await db.getExerciseAttempts(studentId, skillId, n);
    if (!attempts || attempts.length === 0) return 50; // Default: 50%

    const correct = attempts.filter((a: any) => a.isCorrect).length;
    return (correct / attempts.length) * 100;
  }

  private async getConsistency(
    db: any,
    studentId: string,
    skillId: string
  ): Promise<number> {
    const attempts = await db.getExerciseAttempts(studentId, skillId, 20);
    if (!attempts || attempts.length < 5) return 50;

    // Calcular variance por windows de 5
    const accuracies: number[] = [];
    for (let i = 0; i <= attempts.length - 5; i++) {
      const window = attempts.slice(i, i + 5);
      const correct = window.filter((a: any) => a.isCorrect).length;
      accuracies.push((correct / 5) * 100);
    }

    const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance = accuracies.reduce(
      (sum, x) => sum + Math.pow(x - mean, 2),
      0
    ) / accuracies.length;

    const stdDev = Math.sqrt(variance);
    const consistency = 100 * (1 - (stdDev / (mean + 1))); // +1 para evitar div/0

    return Math.max(0, Math.min(100, consistency));
  }

  private async predictFailureRisk(
    studentId: string,
    skillId: string,
    accuracy: number,
    consistency: number
  ): Promise<number> {
    // ML simple: si accuracy baja o consistency baja, riesgo alto
    const accuracyRisk = Math.max(0, (100 - accuracy) / 100) * 50;
    const consistencyRisk = Math.max(0, (100 - consistency) / 100) * 30;
    const baseRisk = 20;

    return Math.min(100, accuracyRisk + consistencyRisk + baseRisk);
  }

  private async getLearningVelocity(
    db: any,
    studentId: string
  ): Promise<'slow' | 'normal' | 'fast'> {
    const recentMasteries = await db.getRecentlyMasteredSkills(studentId, 10);
    if (!recentMasteries || recentMasteries.length === 0) return 'normal';

    const avgDaysToMastery = recentMasteries.reduce(
      (sum: number, s: any) => sum + s.daysToMastery,
      0
    ) / recentMasteries.length;

    if (avgDaysToMastery < 3) return 'fast';
    if (avgDaysToMastery > 7) return 'slow';
    return 'normal';
  }

  private calculateMasteryConfidence(
    attemptCount: number,
    daysSincePractice: number,
    consistency: number
  ): number {
    const attemptMultiplier = Math.min(attemptCount / 10, 1.0);
    const recencyMultiplier = Math.max(1 - (daysSincePractice / 30), 0);
    const consistencyMultiplier = consistency / 100;

    return (
      (attemptMultiplier * 0.4 +
        recencyMultiplier * 0.35 +
        consistencyMultiplier * 0.25) *
      100
    );
  }
}
