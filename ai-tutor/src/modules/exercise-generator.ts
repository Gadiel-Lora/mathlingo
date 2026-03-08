import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import {
  Skill, ProblemStatement, ErrorCategory, GeneratedExercise,
} from '../types';

export class ExerciseGenerator {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder
  ) {}

  async generateExercise(
    skill: Skill,
    difficulty: number,
    masteryLevel: number,
    previousExercises?: ProblemStatement[],
    errorType?: ErrorCategory
  ): Promise<GeneratedExercise> {
    const prompt = this.promptBuilder.buildExerciseGenerationPrompt(
      skill, difficulty, masteryLevel, previousExercises, errorType
    );

    const raw = await this.ollama.generateResponse(prompt);
    const exercise = this.parseExercise(raw, skill, difficulty);

    if (!this.validateGeneratedExercise(exercise)) {
      throw new Error('Generated exercise failed validation. Please retry.');
    }

    return this.adaptToWeakness(exercise, errorType);
  }

  private parseExercise(raw: string, skill: Skill, difficulty: number): GeneratedExercise {
    try {
      const jsonText = this.extractJSON(raw);
      const parsed = JSON.parse(jsonText);

      return {
        id: parsed.id || `gen_${Date.now()}`,
        skillId: parsed.skillId || skill.id,
        difficulty: parsed.difficulty ?? difficulty,
        statement: parsed.statement || '',
        correctAnswer: parsed.correctAnswer || '',
        solutionSteps: Array.isArray(parsed.solutionSteps) ? parsed.solutionSteps : [],
        estimatedTimeMinutes: parsed.estimatedTimeMinutes ?? 3,
        keyConceptsTested: Array.isArray(parsed.keyConceptsTested) ? parsed.keyConceptsTested : [],
        difficulty_rationale: parsed.difficultyRationale || parsed.difficulty_rationale || '',
      };
    } catch {
      // Return a minimal placeholder if parsing fails
      return {
        id: `gen_${Date.now()}`,
        skillId: skill.id,
        difficulty,
        statement: raw.slice(0, 200),
        correctAnswer: '',
        solutionSteps: [],
        estimatedTimeMinutes: 3,
        keyConceptsTested: [skill.name],
        difficulty_rationale: 'Regenerado automáticamente',
      };
    }
  }

  private validateGeneratedExercise(exercise: GeneratedExercise): boolean {
    if (!exercise.statement || exercise.statement.length < 5) return false;
    if (!exercise.correctAnswer) return false;
    return true;
  }

  private adaptToWeakness(exercise: GeneratedExercise, errorType?: ErrorCategory): GeneratedExercise {
    if (!errorType) return exercise;

    // Tag the exercise with the specific weakness being targeted
    const weaknessTags: Record<ErrorCategory, string> = {
      CONCEPTUAL: 'comprensión-conceptual',
      ARITHMETIC: 'precisión-aritmética',
      PROCEDURAL: 'orden-de-pasos',
      NOTATIONAL: 'notación-matemática',
      READING: 'interpretación-del-problema',
    };

    exercise.keyConceptsTested = [
      ...exercise.keyConceptsTested,
      weaknessTags[errorType],
    ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

    return exercise;
  }

  private extractJSON(text: string): string {
    // Try to find a JSON object
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}
