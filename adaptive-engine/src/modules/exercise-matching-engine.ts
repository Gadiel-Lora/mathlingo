/**
 * MOTOR DE MATCHING INTELIGENTE DE EJERCICIOS
 * 
 * Utiliza:
 * - Item Response Theory (IRT)
 * - Algoritmo de matching multi-objetivo
 * - Optimización de dificultad personalizada
 */

export interface Exercise {
  id: string;
  difficulty: number;        // 0-1
  discriminationIndex: number; // Parámetro IRT: cuán bien discrimina masteryLevel
  guessability: number;       // Parámetro IRT: probabilidad de acierto al azar
  concept: string;           // Concepto principal
  relatedConcepts: string[]; // Conceptos secundarios
  estimatedTimeMs: number;
}

export interface StudentProfile {
  masteryLevel: number;      // 0-1
  currentStreak: number;     // Correctas consecutivas
  recentAccuracy: number;    // Últimas 5 respuestas
  timePerProblemMs: number;  // Promedio
  learningVelocity: 'slow' | 'normal' | 'fast';
}

export class ExerciseMatchingEngine {
  /**
   * Algoritmo IRT para calcular probabilidad de éxito
   */
  private calculateIRTSuccessProbability(
    studentMastery: number,
    exerciseDifficulty: number,
    discriminationIndex: number,
    guessability: number = 0.2
  ): number {
    // Modelo logístico de 3 parámetros (3PL):
    // P(θ) = c + (1-c) / (1 + e^(-a(θ-b)))
    // θ = mastery, a = discrimination, b = difficulty, c = guessability

    const exponent = -discriminationIndex * (studentMastery - exerciseDifficulty);
    const midTerm = 1 / (1 + Math.exp(exponent));
    const probability = guessability + (1 - guessability) * midTerm;

    return Math.round(probability * 1000) / 1000;
  }

  /**
   * Calcula la información que proporciona un ejercicio
   * Mayor información = mejor para estimar verdadera maestría
   */
  private calculateInformationValue(
    studentMastery: number,
    exerciseDifficulty: number,
    discriminationIndex: number,
    guessability: number = 0.2
  ): number {
    // Información = Función de Fisher
    const p = this.calculateIRTSuccessProbability(
      studentMastery,
      exerciseDifficulty,
      discriminationIndex,
      guessability
    );

    const q = 1 - p;
    const term = Math.pow(discriminationIndex * (1 - guessability), 2);
    const information = term * p * q;

    return Math.round(information * 10000) / 10000;
  }

  /**
   * Motor principal de matching
   */
  matchExercise(
    student: StudentProfile,
    availableExercises: Exercise[],
    targetSuccessProbability: number = 0.75  // Desirable difficulty: 75% correcto
  ): Exercise {
    const scoredExercises = availableExercises.map(ex => {
      // 1. Calcular probabilidad IRT
      const successProb = this.calculateIRTSuccessProbability(
        student.masteryLevel,
        ex.difficulty,
        ex.discriminationIndex,
        ex.guessability
      );

      // 2. Cuánto se desvía del objetivo (75%)
      const difficultyFit = 1 - Math.abs(successProb - targetSuccessProbability);

      // 3. Información que proporciona
      const information = this.calculateInformationValue(
        student.masteryLevel,
        ex.difficulty,
        ex.discriminationIndex,
        ex.guessability
      );

      // 4. Verificar que no es demasiado largo/corto
      const timeAppropriate = this.calculateTimeAppropiateness(
        ex.estimatedTimeMs,
        student.timePerProblemMs
      );

      // 5. Variedad: favorecer diferentes conceptos
      const conceptVariety = ex.relatedConcepts.length > 0 ? 1 : 0.8;

      // Puntuación compuesta: multi-objetivo
      const score =
        difficultyFit * 0.4 +           // Dificultad es lo más importante
        (information / 10) * 0.3 +      // Información sobre mastery
        timeAppropriate * 0.15 +        // Tiempo razonable
        conceptVariety * 0.15;          // Variedad

      return { exercise: ex, score, successProb };
    });

    // Ordenar por puntuación y seleccionar el mejor
    scoredExercises.sort((a, b) => b.score - a.score);

    return scoredExercises[0].exercise;
  }

  /**
   * Calcula si el tiempo estimado es apropiado
   */
  private calculateTimeAppropiateness(
    exerciseTimeMs: number,
    studentAverageTimeMs: number
  ): number {
    const ratio = exerciseTimeMs / studentAverageTimeMs;

    // Óptimo: 0.8 - 1.2× su promedio
    if (ratio >= 0.8 && ratio <= 1.2) return 1.0;

    // Ligeramente fuera: 0.5 - 0.8× o 1.2 - 1.5×
    if ((ratio >= 0.5 && ratio < 0.8) || (ratio > 1.2 && ratio <= 1.5)) return 0.7;

    // Muy fuera: < 0.5 o > 1.5×
    return 0.4;
  }

  /**
   * Recomendación adaptativa: si estudiante mejora, aumenta dificultad
   */
  recommendDifficultyAdjustment(
    student: StudentProfile,
    lastExerciseDifficulty: number,
    wasSuccessful: boolean
  ): number {
    let newDifficulty = lastExerciseDifficulty;

    // Si está en streak de correctas: aumenta dificultad
    if (wasSuccessful && student.currentStreak >= 3) {
      newDifficulty += 0.1;
    }

    // Si accuracy muy alta: aumenta
    if (student.recentAccuracy > 0.9) {
      newDifficulty += 0.15;
    }

    // Si learningVelocity es fast: aumenta más agresivamente
    if (student.learningVelocity === 'fast') {
      newDifficulty += 0.1;
    }

    // Si fue incorrecto: disminuye
    if (!wasSuccessful) {
      newDifficulty -= 0.1;
    }

    // Clamp a [0.1, 1.0]
    return Math.max(0.1, Math.min(1.0, newDifficulty));
  }

  /**
   * Seleccionar ejercicios que cubran "gaps" de conocimiento
   */
  selectConceptuallyDiverse(
    availableExercises: Exercise[],
    recentExercises: Exercise[],
    targetCount: number = 5
  ): Exercise[] {
    const recentConcepts = new Set(
      recentExercises.flatMap(ex => [ex.concept, ...ex.relatedConcepts])
    );

    // Filtrar: ejercicios con conceptos no vistos recientemente
    const diverse = availableExercises.filter(
      ex => !recentConcepts.has(ex.concept)
    );

    return diverse.slice(0, targetCount);
  }

  /**
   * Estrategia de spaced repetition optimizada
   * Selecciona ejercicios de temas anteriores para refuerzo
   */
  selectForSpacedRepetition(
    masteredConcepts: string[],     // Conceptos con dominio > 0.8
    masteryByTopic: Map<string, number>,
    exercisesByTopic: Map<string, Exercise[]>,
    targetCount: number = 3
  ): Exercise[] {
    // Seleccionar conceptos que están "en el borde del olvido"
    // (dominio entre 0.5 - 0.8)
    const atriskTopics = Array.from(masteryByTopic.entries())
      .filter(([_, mastery]) => mastery >= 0.5 && mastery < 0.8)
      .map(([topic, _]) => topic);

    const selected: Exercise[] = [];

    for (const topic of atriskTopics) {
      const exercisesForTopic = exercisesByTopic.get(topic) || [];
      if (exercisesForTopic.length > 0) {
        // Seleccionar uno random para spaced repetition
        const randomIdx = Math.floor(Math.random() * exercisesForTopic.length);
        selected.push(exercisesForTopic[randomIdx]);
      }

      if (selected.length >= targetCount) break;
    }

    return selected;
  }
}

/**
 * RECOMENDADOR DE MIX DE EJERCICIOS
 * Crea un plan de práctica balanceado
 */
export class ExerciseMixRecommender {
  /**
   * Calcula proporción óptima: New / Review / Challenge
   */
  calculateOptimalMix(
    masteryAverage: number,
    consistencyScore: number
  ): { newExercises: number; review: number; challenge: number } {
    let newExercises: number;
    let review: number;
    let challenge: number;

    if (masteryAverage < 0.4) {
      // Principiante: más nuevo, menos desafío
      newExercises = 0.6;
      review = 0.3;
      challenge = 0.1;
    } else if (masteryAverage < 0.6) {
      // Intermedio: balanceado
      newExercises = 0.4;
      review = 0.4;
      challenge = 0.2;
    } else if (masteryAverage < 0.8) {
      // Avanzado: más revisión
      newExercises = 0.2;
      review = 0.5;
      challenge = 0.3;
    } else {
      // Muy avanzado: poco nuevo, mucho desafío
      newExercises = 0.1;
      review = 0.3;
      challenge = 0.6;
    }

    // Ajustar por consistencia
    if (consistencyScore < 0.5) {
      // Menos consistente: más revisión
      review += 0.15;
      challenge -= 0.15;
    }

    return { newExercises, review, challenge };
  }
}
