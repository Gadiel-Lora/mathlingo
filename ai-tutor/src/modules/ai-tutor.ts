import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import { ExplanationEngine } from './explanation-engine';
import { HintGenerator } from './hint-generator';
import { ExerciseGenerator } from './exercise-generator';
import { StrategyEngine } from './strategy-engine';
import { ContextBuilder } from './context-builder';
import {
  TutorContext, TutorResponse, ExplanationResponse, HintResponse,
  GeneratedExercise, TutoringStrategy, ProblemStatement,
  ErrorCategory, StudentSignals, Skill, ConversationMessage,
} from '../types';

export class AITutor {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder,
    private explanationEngine: ExplanationEngine,
    private hintGenerator: HintGenerator,
    private exerciseGenerator: ExerciseGenerator,
    private contextBuilder: ContextBuilder,
    private strategyEngine: StrategyEngine
  ) {}

  /**
   * Feature 1: Conversational tutoring chat.
   */
  async chat(
    studentId: string,
    studentMessage: string,
    context: TutorContext
  ): Promise<TutorResponse> {
    // Validate context
    if (!context.problem || !context.skillId) {
      throw new Error('Context must include problem and skillId');
    }

    // Add student message to context
    const enrichedContext: TutorContext = {
      ...context,
      studentMessage,
    };

    // Build the conversation prompt
    const prompt = this.promptBuilder.buildChatPrompt(enrichedContext);

    // Call Ollama
    const content = await this.ollama.generateResponse(prompt);

    // Append to conversation history
    context.conversationHistory.push({
      role: 'student',
      content: studentMessage,
      timestamp: new Date(),
      skillId: context.skillId,
    });

    context.conversationHistory.push({
      role: 'tutor',
      content,
      timestamp: new Date(),
      skillId: context.skillId,
    });

    return {
      type: 'guidance',
      content,
      nextAction: 'try_again',
      studentActionGuide: 'Reflexiona sobre la pregunta y responde con tu razonamiento.',
    };
  }

  /**
   * Feature 2: Personalized problem explanation.
   */
  async explainProblem(
    problem: ProblemStatement,
    studentAnswer: string,
    errorType: ErrorCategory,
    masteryLevel: number,
    skill: Skill
  ): Promise<ExplanationResponse> {
    return this.explanationEngine.generateExplanation(
      problem, studentAnswer, errorType, masteryLevel, skill
    );
  }

  /**
   * Feature 4: Progressive hint generation.
   */
  async generateHint(
    problem: ProblemStatement,
    currentStep: number,
    previousHints: string[],
    masteryLevel: number,
    hintLevel: 1 | 2 | 3
  ): Promise<HintResponse> {
    return this.hintGenerator.generateHint(
      problem, currentStep, previousHints, masteryLevel, hintLevel
    );
  }

  /**
   * Feature 5: Dynamic practice exercise generation.
   */
  async generatePracticeExercise(
    skill: Skill,
    difficulty: number,
    masteryLevel: number,
    previousExercises?: ProblemStatement[],
    errorType?: ErrorCategory
  ): Promise<GeneratedExercise> {
    return this.exerciseGenerator.generateExercise(
      skill, difficulty, masteryLevel, previousExercises, errorType
    );
  }

  /**
   * Feature 6: Adaptive tutoring strategy selection.
   */
  async decideTutoringStrategy(
    signals: StudentSignals,
    errorType: ErrorCategory,
    masteryLevel: number
  ): Promise<TutoringStrategy> {
    return this.strategyEngine.decideTutoringStrategy(signals, errorType, masteryLevel);
  }
}

/**
 * Factory function — creates a fully-wired AITutor with all dependencies.
 */
export function createAITutor(ollamaService?: OllamaService): AITutor {
  const ollama = ollamaService ?? new OllamaService();
  const promptBuilder = new PromptBuilder();
  const explanationEngine = new ExplanationEngine(ollama, promptBuilder);
  const hintGenerator = new HintGenerator(ollama, promptBuilder);
  const exerciseGenerator = new ExerciseGenerator(ollama, promptBuilder);
  const contextBuilder = new ContextBuilder();
  const strategyEngine = new StrategyEngine(ollama, promptBuilder);

  return new AITutor(
    ollama, promptBuilder, explanationEngine,
    hintGenerator, exerciseGenerator, contextBuilder, strategyEngine
  );
}
