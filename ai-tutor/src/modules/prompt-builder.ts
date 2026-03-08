import {
  TutorContext, ProblemStatement, ErrorCategory, StudentSignals, Skill,
} from '../types';
import { SYSTEM_PROMPTS, MASTERY_LEVEL_TEMPLATES } from '../config/prompts';

function getMasteryTemplate(level: number): string {
  if (level < 40) return MASTERY_LEVEL_TEMPLATES.BEGINNER;
  if (level < 70) return MASTERY_LEVEL_TEMPLATES.INTERMEDIATE;
  return MASTERY_LEVEL_TEMPLATES.ADVANCED;
}

function getErrorPrompt(errorType: ErrorCategory): string {
  const map: Record<ErrorCategory, string> = {
    CONCEPTUAL: SYSTEM_PROMPTS.CONCEPTUAL_ERROR,
    ARITHMETIC: SYSTEM_PROMPTS.ARITHMETIC_ERROR,
    PROCEDURAL: SYSTEM_PROMPTS.PROCEDURAL_ERROR,
    NOTATIONAL: SYSTEM_PROMPTS.NOTATIONAL_ERROR,
    READING: SYSTEM_PROMPTS.READING_ERROR,
  };
  return map[errorType] || '';
}

export class PromptBuilder {
  /**
   * Build the full conversational chat prompt.
   */
  buildChatPrompt(context: TutorContext): string {
    const masteryLevel = context.mastery.estimatedMastery;

    let prompt = SYSTEM_PROMPTS.BASE_TUTOR;
    prompt += getMasteryTemplate(masteryLevel);

    prompt += `\n\nCONTEXTO DEL ESTUDIANTE:\n`;
    prompt += `- Nivel de dominio actual: ${masteryLevel}%\n`;
    prompt += `- Skill en práctica: ${context.skillName}\n`;
    prompt += `- Tipo de error detectado: ${context.errorClassification?.category ?? 'NINGUNO'}\n`;
    prompt += `- Intento número: ${context.attemptNumber}\n`;

    if (context.problem) {
      prompt += `\nPROBLEMA QUE TRABAJA EL ESTUDIANTE:\n${context.problem.statement}\n`;
      prompt += `Respuesta del estudiante: ${context.studentAnswer}\n`;
    }

    if (context.conversationHistory.length > 0) {
      prompt += `\nHISTORIAL DE CONVERSACIÓN (últimas ${Math.min(5, context.conversationHistory.length)} entradas):\n`;
      context.conversationHistory.slice(-5).forEach((msg) => {
        prompt += `${msg.role === 'student' ? 'ESTUDIANTE' : 'TUTOR'}: ${msg.content}\n`;
      });
      prompt += `\nINSTRUCCIÓN: NO repitas explicaciones anteriores. Si pregunta lo mismo, explica diferente o pregunta qué parte no entendió.\n`;
    }

    prompt += `\nMENSAJE DEL ESTUDIANTE: "${context.studentMessage ?? context.studentAnswer}"\n`;
    prompt += `\nResponde en español siguiendo el método socrático. Máximo 3-4 oraciones.`;

    return prompt;
  }

  /**
   * Build explanation prompt adapted to error type and mastery.
   */
  buildExplanationPrompt(
    problem: ProblemStatement,
    studentAnswer: string,
    errorType: ErrorCategory,
    masteryLevel: number,
    skill: Skill
  ): string {
    let prompt = SYSTEM_PROMPTS.BASE_TUTOR;
    prompt += getErrorPrompt(errorType);
    prompt += getMasteryTemplate(masteryLevel);

    prompt += `\n\nPROBLEMA:\n${problem.statement}\n`;
    prompt += `RESPUESTA DEL ESTUDIANTE: ${studentAnswer}\n`;
    if (problem.solutionSteps) {
      prompt += `SOLUCIÓN CORRECTA PASOS:\n${problem.solutionSteps.join('\n')}\n`;
    }
    prompt += `RESPUESTA CORRECTA: ${problem.correctAnswer}\n`;
    prompt += `SKILL: ${skill.name} (dificultad ${skill.difficulty}/10)\n`;
    prompt += `NIVEL DE DOMINIO DEL ESTUDIANTE: ${masteryLevel}%\n`;
    prompt += `\nExplica el error de forma empática en español. Usa el método socrático. Máximo 4 oraciones.`;

    return prompt;
  }

  /**
   * Build hint prompt at the specified level.
   */
  buildHintPrompt(
    problem: ProblemStatement,
    hintLevel: 1 | 2 | 3,
    masteryLevel: number,
    previousHints: string[] = []
  ): string {
    let prompt = SYSTEM_PROMPTS.BASE_TUTOR;

    const hintMap: Record<1 | 2 | 3, string> = {
      1: SYSTEM_PROMPTS.HINT_LEVEL_1,
      2: SYSTEM_PROMPTS.HINT_LEVEL_2,
      3: SYSTEM_PROMPTS.HINT_LEVEL_3,
    };
    prompt += hintMap[hintLevel];

    if (masteryLevel > 70 && hintLevel === 1) {
      prompt += `\nNOTA: El estudiante tiene buen nivel (${masteryLevel}%). Prefiere usar preguntas socráticas en lugar de pistas directas.`;
    }

    prompt += `\n\nPROBLEMA:\n${problem.statement}\n`;
    prompt += `RESPUESTA CORRECTA (para referencia interna, NO la menciones): ${problem.correctAnswer}\n`;

    if (previousHints.length > 0) {
      prompt += `\nPISTAS YA DADAS (NO las repitas):\n${previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`;
    }

    prompt += `\nGenera la pista nivel ${hintLevel} en español. Respuesta máximo 2-3 oraciones.`;

    return prompt;
  }

  /**
   * Build exercise generation prompt with difficulty adjustment.
   */
  buildExerciseGenerationPrompt(
    skill: Skill,
    difficulty: number,
    masteryLevel: number,
    previousExercises?: ProblemStatement[],
    errorType?: ErrorCategory
  ): string {
    // Adjust difficulty based on mastery
    let adjustedDifficulty = difficulty;
    if (masteryLevel < 40) adjustedDifficulty = Math.max(1, difficulty - 3);
    else if (masteryLevel > 70) adjustedDifficulty = Math.min(10, difficulty + 2);

    let prompt = SYSTEM_PROMPTS.EXERCISE_GENERATION;

    prompt = prompt.replace('SKILL_ID', skill.id);
    prompt = prompt.replace('"difficulty": 5', `"difficulty": ${adjustedDifficulty}`);

    prompt += `\n\nPARAMETROS ESPECÍFICOS:`;
    prompt += `\n- Skill: ${skill.name}`;
    prompt += `\n- Descripción del skill: ${skill.description}`;
    prompt += `\n- Dificultad objetivo: ${adjustedDifficulty}/10`;
    prompt += `\n- Nivel del estudiante: ${masteryLevel}%`;

    if (errorType) {
      prompt += `\n- Tipo de error anterior: ${errorType} (el ejercicio debe especialmente trabajar este aspecto)`;
    }

    if (previousExercises && previousExercises.length > 0) {
      prompt += `\n- Evitar ejercicios similares a:\n`;
      previousExercises.slice(-3).forEach((ex) => {
        prompt += `  • ${ex.statement}\n`;
      });
    }

    prompt += `\n\nRespóndeme SOLO con el JSON válido, nada más.`;

    return prompt;
  }

  /**
   * Build strategy determination prompt.
   */
  buildStrategyPrompt(
    signals: StudentSignals,
    errorType: ErrorCategory,
    masteryLevel: number
  ): string {
    let prompt = SYSTEM_PROMPTS.STRATEGY_DETERMINATION;

    prompt += `\n\nDATOS DEL ESTUDIANTE:`;
    prompt += `\n- Accuracy: ${signals.accuracy}%`;
    prompt += `\n- Consistency: ${signals.consistency}%`;
    prompt += `\n- RetentionRisk: ${signals.retentionRisk}%`;
    prompt += `\n- PredictedFailure: ${signals.predictedFailure}%`;
    prompt += `\n- LearningVelocity: ${signals.learningVelocity}`;
    prompt += `\n- Mastery Level: ${masteryLevel}%`;
    prompt += `\n- Error Type: ${errorType}`;
    prompt += `\n\nRespóndeme SOLO con el JSON válido, nada más.`;

    return prompt;
  }
}
