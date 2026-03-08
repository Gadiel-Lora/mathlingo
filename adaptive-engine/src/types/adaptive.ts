export enum RecommendationType {
  NEXT_LESSON = "NEXT_LESSON",
  REFUERZO_PRÁCTICA = "REFUERZO_PRÁCTICA",
  REFUERZO_CONCEPTUAL = "REFUERZO_CONCEPTUAL",
  DESAFÍO_OPCIONAL = "DESAFÍO_OPCIONAL",
  SPACED_REPETITION = "SPACED_REPETITION",
  REFUERZO_BLOQUEANTE = "REFUERZO_BLOQUEANTE"
}

export interface Signals {
  accuracy: number;                 // 0-100 (últimas 5 respuestas)
  consistency: number;              // 0-100 (estabilidad)
  errorType?: string;
  retentionRisk: number;            // 0-100
  predictedFailure: number;         // 0-100 (probabilidad de fallo siguiente skill)
  learningVelocity: 'slow' | 'normal' | 'fast';
  masteryConfidence: number;        // 0-100
}

export interface Recommendation {
  type: RecommendationType;
  contentId: string;
  lessonType: string;              // "next_lesson" | "refuerzo" | "challenge" | etc
  reason: string;
  confidence: number;              // 0-100
  suggestedActions?: string[];
}
