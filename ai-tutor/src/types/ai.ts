// ===== AI TUTOR CORE TYPES =====

export type ErrorCategory = 'ARITHMETIC' | 'CONCEPTUAL' | 'PROCEDURAL' | 'NOTATIONAL' | 'READING';
export type MasteryLevel = 'novice' | 'intermediate' | 'advanced';
export type TutoringApproach = 'socratic' | 'guided' | 'direct' | 'exploratory';
export type ExplanationDepth = 'surface' | 'moderate' | 'deep';
export type HintAggressiveness = 'passive' | 'moderate' | 'active';
export type LearningVelocity = 'slow' | 'normal' | 'fast';
export type TutorResponseType = 'explanation' | 'hint' | 'exercise' | 'guidance' | 'encouragement';
export type NextAction = 'try_again' | 'next_step' | 'practice' | 'continue';

export interface ErrorClassification {
  category: ErrorCategory;
  severity: 'minor' | 'medium' | 'critical';
  confidence: number;
  reasoning: string;
}

export interface MasteryState {
  mu: number;                // Mean mastery 0–1
  sigma: number;             // Confidence 0–1
  estimatedMastery: number;  // 0–100
  confidence: number;        // 0–100
  attemptCount: number;
}

export interface StudentSignals {
  accuracy: number;
  consistency: number;
  retentionRisk: number;
  predictedFailure: number;
  learningVelocity: LearningVelocity;
  masteryConfidence: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  domain: string;
  difficulty: number;
  prerequisites: string[];
}

export interface ProblemStatement {
  id: string;
  skillId: string;
  difficulty: number;
  statement: string;
  correctAnswer: string;
  solutionSteps?: string[];
  hints?: string[];
}

export interface ConversationMessage {
  role: 'student' | 'tutor';
  content: string;
  timestamp: Date;
  skillId?: string;
}

export interface TutorContext {
  studentId: string;
  skillId: string;
  skillName: string;
  problem: ProblemStatement;
  studentAnswer: string;
  studentMessage?: string;
  errorClassification?: ErrorClassification;
  mastery: MasteryState;
  signals: StudentSignals;
  conversationHistory: ConversationMessage[];
  attemptNumber: number;
  previousHints: string[];
}

export interface TutorResponse {
  type: TutorResponseType;
  content: string;
  additionalContext?: {
    steps?: StepExplanation[];
    examples?: string[];
    resources?: string[];
  };
  nextAction?: NextAction;
  studentActionGuide?: string;
}

export interface StepExplanation {
  stepNumber: number;
  operation: string;
  reasoning: string;
  result: string;
  studentMistakeAt?: boolean;
  correction?: string;
}

export interface TutoringStrategy {
  approach: TutoringApproach;
  explanationDepth: ExplanationDepth;
  hintAggressiveness: HintAggressiveness;
  exampleCount: number;
  focusAreas: string[];
  language_level: MasteryLevel;
  recommendedNextAction: string;
}

export interface GeneratedExercise {
  id: string;
  skillId: string;
  difficulty: number;
  statement: string;
  correctAnswer: string;
  solutionSteps: string[];
  estimatedTimeMinutes: number;
  keyConceptsTested: string[];
  difficulty_rationale: string;
}

export interface ExplanationResponse {
  mainExplanation: string;
  stepByStep?: StepExplanation[];
  examples?: {
    similar: string;
    different: string;
  };
  commonMistakes?: string[];
  tipsAndTricks?: string[];
  language: MasteryLevel;
}

export interface HintResponse {
  hint: string;
  hintLevel: 1 | 2 | 3;
  isSocraticQuestion?: boolean;
  followUpGuidance?: string;
}

export interface PerformanceData {
  recentAccuracy: number;
  recentAttempts: number;
  lastErrorType?: ErrorCategory;
  streakCorrect: number;
}


export type ExplanationPreference = 'visual' | 'algebraic' | 'contextual' | 'mixed';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface SkillData {
  skillId: string;
  skillName?: string;
  masteryLevel: number;
  confidence?: number;
}

export interface ErrorPattern {
  patternType: string;
  count?: number;
  recentErrors?: string[];
  lastSeen?: string;
}

export interface Trend {
  area: string;
  direction: 'improving' | 'stable' | 'declining';
  delta?: number;
}
export interface DiagnosticAnalysis {
  problemId?: string;
  studentAnswer?: string;
  errorType?: ErrorCategory;
  conceptsGrasped: string[];
  conceptsMissing: string[];
  rootCause: string;
  procedureStrength: number;
  conceptualDepth: number;
  transferability: number;
  isRecurring: boolean;
  errorPattern: string;
  primaryWeakness: string;
  secondaryWeaknesses: string[];
  strengths: string[];
  recommendation: string;
}

export interface SkillMasteryDetail {
  masteryLevel: number;
  confidence: number;
  conceptualUnderstanding?: number;
  transferAbility?: number;
  strengthAreas?: string[];
  weaknessAreas?: string[];
  trendDirection?: 'improving' | 'stable' | 'declining';
}
export interface LearningProfileCore {
  preferredExplanationStyle: ExplanationPreference;
  learningSpeed: LearningVelocity;
  confidenceLevel: ConfidenceLevel;
  strengths: Array<{
    skill: string;
    masteryLevel: number;
    confidence?: number;
    evidence?: string;
    note?: string;
  }>;
  challenges: Array<{
    skill: string;
    masteryLevel: number;
    primaryIssue: string;
    confidence?: number;
    evidence?: string;
    note?: string;
  }>;
  patterns: {
    improvingAreas: string[];
    stuckAreas: string[];
    errorTrend: string;
    consistencyScore: number;
    mostCommonErrorType?: string;
  };
}
export interface LearningProfileRecommendations {
  immediate: {
    skill: string;
    reason: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
  };
  shortTerm: {
    focusArea?: string;
    skills: string[];
    estimatedWeeks?: number;
  };
  learningPath: {
    phase1_foundation: string[];
    phase2_intermediate: string[];
    phase3_advanced: string[];
  };
}
export interface StudentLearningProfile {
  studentId?: string;
  preferredExplanationStyle?: ExplanationPreference;
  learningSpeed?: LearningVelocity;
  confidenceLevel?: ConfidenceLevel;
  skillAnalysis?: Record<string, SkillMasteryDetail>;
  learningProfile?: LearningProfileCore;
  patterns?: LearningProfileCore['patterns'];
  recommendations?: LearningProfileRecommendations;
  recommendedPath?: {
    immediate?: {
      skill: string;
      reason: string;
      urgency: 'critical' | 'high' | 'medium' | 'low';
    };
    shortTerm?: string[];
    longTerm?: string[];
  };
}
export interface PracticeExerciseRecommendation {
  skill: string;
  difficulty: number;
  reason: string;
  estimatedTimeMinutes: number;
  successRateExpected: number;
}

export interface PracticeRecommendation {
  practicePlan: {
    focus: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    suggestedExercises: PracticeExerciseRecommendation[];
    sequence: string[];
    expectedOutcome: string;
  };
}
export interface SkillGraph {
  edges?: Array<{ from: string; to: string }>;
  prerequisites?: Record<string, string[]>;
  dependents?: Record<string, string[]>;
}

export interface PathRecommendation {
  personalizedPath: {
    criticalGaps: Array<{
      skill: string;
      urgency: 'critical' | 'high' | 'medium' | 'low';
      reason: string;
    }>;
    strengths: {
      readyForAdvanced: string[];
      canTeachOthers: string[];
    };
    recommendedSequence: {
      phase1_foundation: string[];
      phase2_consolidation: string[];
      phase3_advancement: string[];
    };
    alternativePaths: {
      ifPreferencesVisual: string[];
      ifPreferencesAlgebraic: string[];
      ifPreferencesContextual: string[];
    };
    estimatedTimeline: {
      readyForNextGrade: string;
      readyForAdvancedChallenges: string;
      estimatedMasteryCompletion: string;
    };
    rationale: string;
  };
}
