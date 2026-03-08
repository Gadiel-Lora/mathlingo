import {
  TutorContext, MasteryState, StudentSignals, ProblemStatement,
  ErrorClassification, ConversationMessage, Skill,
} from '../types';
import { BuildContextInput } from '../types/context';

const DEFAULT_MASTERY: MasteryState = {
  mu: 0.5, sigma: 0.3, estimatedMastery: 50, confidence: 70, attemptCount: 0,
};

const DEFAULT_SIGNALS: StudentSignals = {
  accuracy: 75, consistency: 70, retentionRisk: 20,
  predictedFailure: 20, learningVelocity: 'normal', masteryConfidence: 70,
};

export class ContextBuilder {
  /**
   * Build a complete TutorContext from provided inputs.
   * In production this would fetch skill from DB.
   */
  async buildContext(input: BuildContextInput): Promise<TutorContext> {
    const {
      studentId, skillId, problem, studentAnswer,
      errorClassification, masteryState, signals, conversationHistory,
    } = input;

    // In production: fetch skill from DB
    const skill = await this.fetchSkillMock(skillId);

    return {
      studentId,
      skillId,
      skillName: skill.name,
      problem,
      studentAnswer,
      errorClassification,
      mastery: masteryState ?? DEFAULT_MASTERY,
      signals: signals ?? DEFAULT_SIGNALS,
      conversationHistory: conversationHistory ?? [],
      attemptNumber: 1,
      previousHints: [],
    };
  }

  /**
   * Enrich context with related skills and past mistakes.
   */
  async enrichContext(context: TutorContext): Promise<TutorContext> {
    // In production: query DB for prerequisites, related skills, past mistakes
    return context;
  }

  // ====== Mock — replace with real DB calls in production ======
  private async fetchSkillMock(skillId: string): Promise<Skill> {
    return {
      id: skillId,
      name: `Skill ${skillId}`,
      description: 'Habilidad matemática',
      domain: 'math',
      difficulty: 5,
      prerequisites: [],
    };
  }
}
