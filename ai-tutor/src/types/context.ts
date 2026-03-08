import { ErrorCategory, MasteryState, StudentSignals, ProblemStatement, ConversationMessage, ErrorClassification } from './ai';

export interface GeneratorContext {
  masteryLevel: number;
  errorType?: ErrorCategory;
  previousExerciseTopics?: string[];
}

export interface EnrichedContext {
  skillPrerequisites: string[];
  relatedSkills: string[];
  pastMistakePatterns: ErrorCategory[];
  studentStrengths: string[];
}

export interface BuildContextInput {
  studentId: string;
  skillId: string;
  problem: ProblemStatement;
  studentAnswer: string;
  errorClassification?: ErrorClassification;
  masteryState?: MasteryState;
  signals?: StudentSignals;
  conversationHistory?: ConversationMessage[];
}
