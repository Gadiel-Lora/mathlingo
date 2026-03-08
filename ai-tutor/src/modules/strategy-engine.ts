import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import { StudentSignals, ErrorCategory, TutoringStrategy } from '../types';

export class StrategyEngine {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder
  ) {}

  async decideTutoringStrategy(
    signals: StudentSignals,
    errorType: ErrorCategory,
    masteryLevel: number
  ): Promise<TutoringStrategy> {
    const prompt = this.promptBuilder.buildStrategyPrompt(signals, errorType, masteryLevel);
    const raw = await this.ollama.generateResponse(prompt);

    try {
      const jsonText = this.extractJSON(raw);
      const parsed = JSON.parse(jsonText);
      return this.validateStrategy(parsed, signals, masteryLevel);
    } catch {
      // Return deterministic fallback strategy
      return this.deterministicStrategy(signals, errorType, masteryLevel);
    }
  }

  /**
   * Deterministic fallback - applies the STRATEGY_DETERMINATION logic manually.
   */
  deterministicStrategy(
    signals: StudentSignals,
    errorType: ErrorCategory,
    masteryLevel: number
  ): TutoringStrategy {
    let approach: TutoringStrategy['approach'] = 'guided';
    let explanationDepth: TutoringStrategy['explanationDepth'] = 'moderate';
    let hintAggressiveness: TutoringStrategy['hintAggressiveness'] = 'moderate';
    const focusAreas: string[] = [errorType.toLowerCase()];

    if (signals.accuracy < 60) {
      approach = 'direct';
      hintAggressiveness = 'active';
    }
    if (signals.consistency < 50) {
      explanationDepth = 'deep';
    }
    if (signals.retentionRisk > 75) {
      focusAreas.push('repaso-spaced-repetition');
    }
    if (signals.predictedFailure > 70) {
      explanationDepth = 'deep';
      hintAggressiveness = 'active';
    }
    if (signals.learningVelocity === 'fast') {
      approach = 'socratic';
      explanationDepth = 'deep';
    }
    if (signals.learningVelocity === 'slow') {
      approach = 'guided';
      explanationDepth = 'moderate';
    }
    if (masteryLevel > 75) {
      approach = 'socratic';
      hintAggressiveness = 'passive';
    }

    const languageLevel: TutoringStrategy['language_level'] =
      masteryLevel < 40 ? 'novice' : masteryLevel < 70 ? 'intermediate' : 'advanced';

    return {
      approach,
      explanationDepth,
      hintAggressiveness,
      exampleCount: signals.accuracy < 60 ? 3 : 2,
      focusAreas,
      language_level: languageLevel,
      recommendedNextAction: this.getRecommendedAction(signals, masteryLevel),
    };
  }

  private validateStrategy(parsed: any, signals: StudentSignals, masteryLevel: number): TutoringStrategy {
    const validApproaches = ['socratic', 'guided', 'direct', 'exploratory'];
    const validDepths = ['surface', 'moderate', 'deep'];
    const validAggressiveness = ['passive', 'moderate', 'active'];
    const validLevels = ['novice', 'intermediate', 'advanced'];

    return {
      approach: validApproaches.includes(parsed.approach) ? parsed.approach : 'guided',
      explanationDepth: validDepths.includes(parsed.explanationDepth) ? parsed.explanationDepth : 'moderate',
      hintAggressiveness: validAggressiveness.includes(parsed.hintAggressiveness) ? parsed.hintAggressiveness : 'moderate',
      exampleCount: typeof parsed.exampleCount === 'number' ? parsed.exampleCount : 2,
      focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [],
      language_level: validLevels.includes(parsed.languageLevel ?? parsed.language_level) ? (parsed.languageLevel ?? parsed.language_level) : 'intermediate',
      recommendedNextAction: parsed.recommendedNextAction || this.getRecommendedAction(signals, masteryLevel),
    };
  }

  private getRecommendedAction(signals: StudentSignals, masteryLevel: number): string {
    if (signals.accuracy < 50) return 'Revisar concepto base con ejemplos simples';
    if (signals.retentionRisk > 75) return 'Hacer repaso de skills anteriores (spaced repetition)';
    if (signals.learningVelocity === 'fast' && masteryLevel > 70) return 'Avanzar a desafío opcional';
    return 'Continuar con el ejercicio actual';
  }

  private extractJSON(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}
