import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import { ProblemStatement, HintResponse } from '../types';

export class HintGenerator {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder
  ) {}

  async generateHint(
    problem: ProblemStatement,
    currentStep: number,
    previousHints: string[],
    masteryLevel: number,
    hintLevel: 1 | 2 | 3
  ): Promise<HintResponse> {
    const prompt = this.promptBuilder.buildHintPrompt(
      problem, hintLevel, masteryLevel, previousHints
    );

    const rawHint = await this.ollama.generateResponse(prompt);
    const hint = this.buildProgressiveHint(rawHint.trim(), hintLevel);
    const isSocraticQuestion = this.shouldGenerateSocraticQuestion(masteryLevel, previousHints.length);

    return {
      hint,
      hintLevel,
      isSocraticQuestion,
      followUpGuidance: this.getFollowUpGuidance(hintLevel),
    };
  }

  private buildProgressiveHint(hint: string, level: 1 | 2 | 3): string {
    // Level 3 hints should end with a question to prompt final step
    if (level === 3 && !hint.includes('?')) {
      return `${hint} ¿Puedes terminar desde aquí?`;
    }
    return hint;
  }

  private shouldGenerateSocraticQuestion(masteryLevel: number, previousHintCount: number): boolean {
    // Socratic for advanced students early in hints, direct for low mastery
    return masteryLevel > 65 && previousHintCount < 2;
  }

  private getFollowUpGuidance(hintLevel: 1 | 2 | 3): string {
    const guidance: Record<1 | 2 | 3, string> = {
      1: 'Piensa un momento y trata de aplicar esta idea.',
      2: 'Con esta dirección, intenta dar el siguiente paso tú mismo.',
      3: 'Ya tienes casi todo. Solo falta el paso final.',
    };
    return guidance[hintLevel];
  }
}
