
import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import {
  DiagnosticAnalysis,
  StudentLearningProfile,
  ErrorCategory,
  ProblemStatement,
  PracticeRecommendation,
  TutoringStrategy,
  LearningVelocity,
  ConfidenceLevel,
} from '../types';

export class AdaptiveCoachingEngine {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder
  ) {}

  async provideCoachingFeedback(
    profile: StudentLearningProfile,
    problem: ProblemStatement,
    studentAnswer: string,
    errorType: ErrorCategory,
    diagnostics: DiagnosticAnalysis
  ): Promise<string> {
    const prompt = this.promptBuilder.buildCoachingPrompt(
      profile,
      problem,
      studentAnswer,
      errorType,
      diagnostics
    );

    try {
      const response = await this.ollama.generateResponse(prompt);
      return response.trim();
    } catch {
      return 'Veo el esfuerzo. Revisemos juntos el concepto clave y probemos un ejemplo mas simple.';
    }
  }

  async decideTutoringStrategy(
    masteryLevel: number,
    consistency: number,
    confidenceLevel: ConfidenceLevel,
    learningVelocity: LearningVelocity
  ): Promise<TutoringStrategy> {
    let approach: TutoringStrategy['approach'] = 'guided';
    let explanationDepth: TutoringStrategy['explanationDepth'] = 'moderate';
    let hintAggressiveness: TutoringStrategy['hintAggressiveness'] = 'moderate';

    if (masteryLevel < 40) {
      approach = 'guided';
      hintAggressiveness = 'active';
      explanationDepth = consistency < 50 ? 'deep' : 'moderate';
    } else if (masteryLevel > 80 && confidenceLevel === 'high') {
      approach = 'exploratory';
      explanationDepth = 'deep';
      hintAggressiveness = 'passive';
    } else if (masteryLevel >= 40 && masteryLevel <= 70 && consistency >= 50) {
      approach = 'socratic';
      explanationDepth = 'moderate';
    }

    if (learningVelocity === 'fast' && masteryLevel >= 60) {
      approach = 'socratic';
      explanationDepth = 'deep';
    }
    if (learningVelocity === 'slow') {
      approach = 'guided';
      hintAggressiveness = 'active';
    }

    const languageLevel: TutoringStrategy['language_level'] =
      masteryLevel < 40 ? 'novice' : masteryLevel < 70 ? 'intermediate' : 'advanced';

    return {
      approach,
      explanationDepth,
      hintAggressiveness,
      exampleCount: masteryLevel < 40 ? 3 : 2,
      focusAreas: masteryLevel < 40 ? ['fundamentos'] : [],
      language_level: languageLevel,
      recommendedNextAction: masteryLevel < 40
        ? 'Repasar el concepto base paso a paso'
        : consistency < 50
          ? 'Resolver un ejemplo guiado para estabilizar'
          : 'Continuar con el siguiente ejercicio',
    };
  }

  async suggestTargetedPractice(
    profile: StudentLearningProfile,
    weaknessAreas: string[]
  ): Promise<PracticeRecommendation> {
    const prompt = this.promptBuilder.buildTargetedPracticePrompt(profile, weaknessAreas);
    const fallback = this.buildFallbackPractice(weaknessAreas);

    try {
      const raw = await this.ollama.generateResponse(prompt);
      const parsed = JSON.parse(this.extractJSON(raw));
      return this.normalizePractice(parsed, fallback);
    } catch {
      return fallback;
    }
  }

  private normalizePractice(parsed: any, fallback: PracticeRecommendation): PracticeRecommendation {
    const plan = parsed.practicePlan ?? parsed;
    if (!plan || typeof plan !== 'object') return fallback;

    const focus = typeof plan.focus === 'string' ? plan.focus : fallback.practicePlan.focus;
    const urgency = ['critical', 'high', 'medium', 'low'].includes(plan.urgency)
      ? plan.urgency
      : fallback.practicePlan.urgency;

    const suggestedExercises = Array.isArray(plan.suggestedExercises)
      ? plan.suggestedExercises
      : fallback.practicePlan.suggestedExercises;

    const sequence = Array.isArray(plan.sequence) ? plan.sequence : fallback.practicePlan.sequence;
    const expectedOutcome = typeof plan.expectedOutcome === 'string'
      ? plan.expectedOutcome
      : fallback.practicePlan.expectedOutcome;

    return {
      practicePlan: {
        focus,
        urgency,
        suggestedExercises,
        sequence,
        expectedOutcome,
      },
    };
  }

  private buildFallbackPractice(weaknessAreas: string[]): PracticeRecommendation {
    const focus = weaknessAreas[0] ?? 'fundamentos';
    const exercises = (weaknessAreas.length > 0 ? weaknessAreas : [focus]).slice(0, 3).map((skill) => ({
      skill,
      difficulty: 4,
      reason: 'Refuerzo directo de la debilidad detectada',
      estimatedTimeMinutes: 10,
      successRateExpected: 75,
    }));

    return {
      practicePlan: {
        focus,
        urgency: 'high',
        suggestedExercises: exercises,
        sequence: exercises.map((e) => e.skill),
        expectedOutcome: 'Mejorar estabilidad y precision en el concepto',
      },
    };
  }

  private extractJSON(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}

