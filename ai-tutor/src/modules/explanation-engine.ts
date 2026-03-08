import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import {
  ProblemStatement, ErrorCategory, MasteryState, Skill,
  ExplanationResponse, StepExplanation,
} from '../types';

export class ExplanationEngine {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder
  ) {}

  async generateExplanation(
    problem: ProblemStatement,
    studentAnswer: string,
    errorType: ErrorCategory,
    masteryLevel: number,
    skill: Skill
  ): Promise<ExplanationResponse> {
    const prompt = this.promptBuilder.buildExplanationPrompt(
      problem, studentAnswer, errorType, masteryLevel, skill
    );

    const rawExplanation = await this.ollama.generateResponse(prompt);
    const adapted = this.adaptLanguageToMastery(rawExplanation, masteryLevel);

    const response: ExplanationResponse = {
      mainExplanation: adapted,
      language: masteryLevel < 40 ? 'novice' : masteryLevel < 70 ? 'intermediate' : 'advanced',
    };

    // Add step-by-step if solution steps exist
    if (problem.solutionSteps && problem.solutionSteps.length > 0) {
      response.stepByStep = await this.generateStepByStep(
        problem,
        problem.solutionSteps,
        studentAnswer
      );
    }

    return response;
  }

  async generateStepByStep(
    problem: ProblemStatement,
    solutionSteps: string[],
    studentAnswer: string
  ): Promise<StepExplanation[]> {
    const prompt = `Eres un tutor de matemáticas. Explica esta solución paso a paso en español.

Problema: ${problem.statement}
Respuesta del estudiante: ${studentAnswer}
Respuesta correcta: ${problem.correctAnswer}

Pasos de la solución:
${solutionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Para cada paso, responde en JSON:
[
  {
    "stepNumber": 1,
    "operation": "nombre de la operación",
    "reasoning": "por qué hacemos este paso",
    "result": "resultado del paso",
    "studentMistakeAt": false,
    "correction": null
  }
]

Identifica en qué paso el estudiante divergió e indica studentMistakeAt: true y proporciona correction.
Responde SOLO con el JSON válido.`;

    try {
      const raw = await this.ollama.generateResponse(prompt);
      const parsed = JSON.parse(this.extractJSON(raw));
      if (Array.isArray(parsed)) return parsed as StepExplanation[];
    } catch {
      // fallback: construct basic steps
    }

    // Fallback: build steps from solution strings
    return solutionSteps.map((step, idx) => ({
      stepNumber: idx + 1,
      operation: step,
      reasoning: 'Aplicar operación matemática',
      result: idx === solutionSteps.length - 1 ? problem.correctAnswer : step,
      studentMistakeAt: false,
    }));
  }

  private adaptLanguageToMastery(explanation: string, masteryLevel: number): string {
    // For very low mastery, ensure the explanation doesn't start abruptly
    if (masteryLevel < 40 && !explanation.startsWith('¡')) {
      return `Tranquilo, esto lo podemos entender juntos. ${explanation}`;
    }
    return explanation;
  }

  private extractJSON(text: string): string {
    // Try to extract JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    return match ? match[0] : '[]';
  }
}
