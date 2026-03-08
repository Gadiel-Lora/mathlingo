import { ErrorCategory, ErrorClassification, ErrorSeverity } from '../types/errors';
import { ERROR_TAXONOMY } from '../config/error-taxonomy';

export interface ClassificationInput {
  problem: {
    statement: string;
    correctAnswer: string;
    expectedNotation?: RegExp;
    correctSteps?: string[];
  };
  studentAnswer: string;
  attemptDetails?: {
    attemptNumber?: number;
    stepsProvided?: string[];
    notationUsed?: string;
    timeMs?: number;
  };
}

export class ErrorClassifier {
  /**
   * Clasifica error de estudiante en categoría
   * 
   * Estrategia: reglas -> análisis de pasos -> ML simple
   */
  async classify(input: ClassificationInput): Promise<ErrorClassification> {
    const { problem, studentAnswer, attemptDetails } = input;

    // Paso 1: Normalizar respuestas
    const normalized = this.normalize(problem.correctAnswer, studentAnswer);

    // Paso 2: Análisis de pasos — PRIMERO (mayor prioridad cognitiva)
    if (attemptDetails?.stepsProvided && problem.correctSteps && attemptDetails.stepsProvided.length > 0) {
      const stepAnalysis = this.analyzeSteps(problem.correctSteps, attemptDetails.stepsProvided);

      if (stepAnalysis.logicBreakdown) {
        return {
          category: ErrorCategory.CONCEPTUAL,
          severity: ErrorSeverity.CRITICAL,
          confidence: 85,
          reasoning: `Lógica rompe en pasos: ${stepAnalysis.breakdownPoint}`,
          remediation: ERROR_TAXONOMY[ErrorCategory.CONCEPTUAL].remediation,
          detectedPatterns: stepAnalysis.patterns
        };
      }

      if (stepAnalysis.orderWrong) {
        return {
          category: ErrorCategory.PROCEDURAL,
          severity: ErrorSeverity.MEDIUM,
          confidence: 80,
          reasoning: `Pasos en orden incorrecto (distancia: ${stepAnalysis.distance})`,
          remediation: ERROR_TAXONOMY[ErrorCategory.PROCEDURAL].remediation,
          detectedPatterns: stepAnalysis.patterns
        };
      }
    }

    // Paso 3: Check numérico cercano (ARITHMETIC) — solo si no hay pasos
    const numericCheck = this.checkNumericalProximity(normalized.correct, normalized.student);
    if (numericCheck.isClose) {
      return {
        category: ErrorCategory.ARITHMETIC,
        severity: ErrorSeverity.MINOR,
        confidence: 95,
        reasoning: `Respuesta numérica muy cercana (${numericCheck.percentDiff.toFixed(1)}% diferencia)`,
        remediation: ERROR_TAXONOMY[ErrorCategory.ARITHMETIC].remediation
      };
    }

    // Paso 4: Análisis de notación (NOTATIONAL)
    const notationCheck = this.analyzeNotation(studentAnswer, problem.expectedNotation);
    if (notationCheck.hasError) {
      return {
        category: ErrorCategory.NOTATIONAL,
        severity: ErrorSeverity.MINOR,
        confidence: 75,
        reasoning: notationCheck.reason,
        remediation: ERROR_TAXONOMY[ErrorCategory.NOTATIONAL].remediation
      };
    }

    // Paso 5: Modelo ML simple (features)
    const features = this.extractFeatures(problem, studentAnswer, attemptDetails);
    const mlPrediction = this.classifyWithML(features);

    return {
      category: mlPrediction.category,
      severity: mlPrediction.severity,
      confidence: mlPrediction.confidence,
      reasoning: mlPrediction.reasoning,
      remediation: ERROR_TAXONOMY[mlPrediction.category].remediation
    };
  }

  // === MÉTODOS AUXILIARES ===

  private normalize(correct: string, student: string) {
    return {
      correct: correct.trim().toLowerCase().replace(/\s+/g, ""),
      student: student.trim().toLowerCase().replace(/\s+/g, "")
    };
  }

  private checkNumericalProximity(correct: string, student: string) {
    const correctNum = this.extractNumber(correct);
    const studentNum = this.extractNumber(student);

    if (correctNum === null || studentNum === null) {
      return { isClose: false, percentDiff: 100 };
    }

    const percentDiff = Math.abs(correctNum - studentNum) / Math.abs(correctNum);
    const isClose = percentDiff > 0 && percentDiff < 0.05; // 5% tolerance but not 0

    return { isClose, percentDiff: percentDiff * 100 };
  }

  private extractNumber(str: string): number | null {
    const match = str.match(/[+-]?\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  private analyzeSteps(correctSteps: string[], studentSteps: string[]) {
    if (studentSteps.length === 0) {
      return {
        logicBreakdown: true,
        breakdownPoint: "No hay pasos",
        orderWrong: false,
        distance: 0,
        patterns: ["missing_steps"]
      };
    }

    // Check si primer paso es correcto
    const firstStepCorrect = this.compareSteps(correctSteps[0], studentSteps[0]);

    if (!firstStepCorrect) {
      return {
        logicBreakdown: true,
        breakdownPoint: `Paso 1: esperado "${correctSteps[0]}", obtuvo "${studentSteps[0]}"`,
        orderWrong: false,
        distance: 0,
        patterns: ["incorrect_first_step"]
      };
    }

    // Calcular distancia de edición (Levenshtein)
    const distance = this.levenshteinDistance(correctSteps, studentSteps);
    const orderWrong = distance > 1;

    // Verificar si el último paso (resultado final) es incorrecto — error conceptual
    const lastCorrectStep = correctSteps[correctSteps.length - 1];
    const lastStudentStep = studentSteps[studentSteps.length - 1];
    const lastStepWrong = !this.compareSteps(lastCorrectStep, lastStudentStep);

    if (lastStepWrong && !orderWrong) {
      return {
        logicBreakdown: true,
        breakdownPoint: `Resultado final incorrecto: esperado "${lastCorrectStep}", obtuvo "${lastStudentStep}"`,
        orderWrong: false,
        distance,
        patterns: ["wrong_final_answer"]
      };
    }

    return {
      logicBreakdown: false,
      breakdownPoint: null,
      orderWrong,
      distance,
      patterns: orderWrong ? ["wrong_order", `distance_${distance}`] : []
    };
  }

  private compareSteps(step1: string, step2: string): boolean {
    return step1.trim().toLowerCase() === step2.trim().toLowerCase();
  }

  private levenshteinDistance(a: string[], b: string[]): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1].toLowerCase() === a[j - 1].toLowerCase()) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private analyzeNotation(answer: string, expectedNotation?: RegExp) {
    if (!expectedNotation) {
      return { hasError: false, reason: "" };
    }

    if (!expectedNotation.test(answer)) {
      return {
        hasError: true,
        reason: "Notación no estándar o incorrecta"
      };
    }

    return { hasError: false, reason: "" };
  }

  private extractFeatures(problem: any, studentAnswer: string, attemptDetails: any) {
    return {
      lengthRatio: studentAnswer.length / (problem.correctAnswer.length || 1),
      wordOverlap: this.wordOverlapScore(problem.correctAnswer, studentAnswer),
      hasNumbers: /\d/.test(studentAnswer),
      hasSymbols: /[\+\-\*\/\=\(\)]/.test(studentAnswer),
      timeToAnswer: attemptDetails?.timeMs || 0,
      attemptNumber: attemptDetails?.attemptNumber || 1
    };
  }

  private wordOverlapScore(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\W+/).filter(w => w));
    const words2 = new Set(str2.split(/\W+/).filter(w => w));

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = words1.size + words2.size - intersection;

    return union === 0 ? 0 : intersection / union;
  }

  private classifyWithML(features: any) {
    // ML simple: weighted scoring
    const scores = {
      [ErrorCategory.ARITHMETIC]: features.lengthRatio > 0.8 ? 70 : 30,
      [ErrorCategory.CONCEPTUAL]: features.wordOverlap < 0.3 ? 80 : 20,
      [ErrorCategory.PROCEDURAL]: features.lengthRatio > 1.2 ? 60 : 20,
      [ErrorCategory.NOTATIONAL]: !features.hasSymbols ? 80 : 20,
      [ErrorCategory.READING]: features.wordOverlap < 0.2 ? 70 : 20,
      [ErrorCategory.UNKNOWN]: 10
    };

    let maxCategory = ErrorCategory.UNKNOWN;
    let maxScore = -1;

    for (const [cat, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score as number;
            maxCategory = cat as ErrorCategory;
        }
    }

    return {
      category: maxCategory,
      severity: ERROR_TAXONOMY[maxCategory]?.severity || ErrorSeverity.MEDIUM,
      confidence: maxScore,
      reasoning: `ML classification: ${maxScore}% confidence`
    };
  }
}
