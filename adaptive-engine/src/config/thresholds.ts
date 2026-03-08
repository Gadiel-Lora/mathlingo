import { SkillCriticality, UnlockCriteria } from '../types/mastery';

export const UNLOCK_THRESHOLDS: Record<SkillCriticality, UnlockCriteria> = {
  [SkillCriticality.CORE]: {
    mastery: 85,
    confidence: 80,
    minAttempts: 6
  },
  [SkillCriticality.STRUCTURAL]: {
    mastery: 75,
    confidence: 70,
    minAttempts: 5
  },
  [SkillCriticality.SUPPORT]: {
    mastery: 65,
    confidence: 60,
    minAttempts: 3
  }
};

// Decaimiento exponencial para retención
export const RETENTION_CONFIG = {
  halfLife: 14 * 24 * 60 * 60 * 1000, // 14 días en ms
  riskThreshold: 75                    // % de riesgo que activa refuerzo
};

// Spaced repetition intervals
export const SPACED_REPETITION_INTERVALS = [
  3 * 24 * 60 * 60 * 1000,   // 3 días
  7 * 24 * 60 * 60 * 1000,   // 7 días
  14 * 24 * 60 * 60 * 1000,  // 14 días
  30 * 24 * 60 * 60 * 1000,  // 30 días
  60 * 24 * 60 * 60 * 1000   // 60 días
];
