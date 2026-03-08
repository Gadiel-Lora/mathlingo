export enum SkillCriticality {
  CORE = "CORE",                    // Fondamentos críticos
  STRUCTURAL = "STRUCTURAL",        // Construcción intermedia
  SUPPORT = "SUPPORT"               // Apoyo/refuerzo
}

export interface MasteryState {
  skillId: string;
  mu: number;                       // Media estimada (0-1)
  sigma: number;                    // Desviación estándar (incertidumbre)
  estimatedMastery: number;         // 0-100 (redondeado)
  confidence: number;               // 0-100 (basado en sigma)
  attemptCount: number;
  lastPracticeDate: Date;
  status: 'locked' | 'in_progress' | 'unlocked' | 'mastered';
}

export interface UnlockCriteria {
  mastery: number;                  // % mínimo
  confidence: number;               // % mínimo
  minAttempts: number;
}

export interface UnlockResult {
  shouldUnlock: boolean;
  reason: string;
  gaps: string[];                   // Qué le falta para desbloquear
}
