import { Recommendation, RecommendationType, Signals } from '../types/adaptive';
import { SkillCriticality } from '../types/mastery';
import { SignalsCalculator } from './signals-calculator';

export interface RecommendationInput {
  studentId: string;
  skillId: string;
  signals: Signals;
  skillCriticality: SkillCriticality;
  lastExerciseResult?: {
    isCorrect: boolean;
    errorCategory?: string;
  };
}

export class AdaptiveEngine {
  private signalsCalculator: SignalsCalculator;

  constructor() {
    this.signalsCalculator = new SignalsCalculator();
  }

  /**
   * MOTOR ADAPTATIVO PRINCIPAL
   * 
   * Lógica de decisión: 85% curriculum + 15% desviación
   */
  async recommend(
    input: RecommendationInput,
    db: any // Interface a base de datos
  ): Promise<Recommendation> {
    const { studentId, skillId, signals, skillCriticality } = input;

    // ===== CONDICIÓN 1: ¿Hay skill antigua en riesgo crítico? =====
    // Prioridad: ALTÍSIMA
    if (signals.retentionRisk > 75) {
      const mostAtRiskSkill = await this.findMostAtRiskSkill(db, studentId);
      if (mostAtRiskSkill) {
        return {
          type: RecommendationType.SPACED_REPETITION,
          contentId: mostAtRiskSkill.id,
          lessonType: 'refuerzo_contextual',
          reason: `Riesgo crítico de olvido: ${mostAtRiskSkill.name} (${Math.round(signals.retentionRisk)}%)`,
          confidence: 95,
          suggestedActions: ['Revisar fundamentos', 'Práctica espaciada']
        };
      }
    }

    // ===== CONDICIÓN 2: ¿Falta en skill actual? =====
    // Prioridad: MUY ALTA
    if (signals.accuracy < 65 || signals.predictedFailure > 75) {
      if (signals.errorType === 'CONCEPTUAL') {
        return {
          type: RecommendationType.REFUERZO_CONCEPTUAL,
          contentId: skillId,
          lessonType: 'mini_lesson_reexplanation',
          reason: `No comprendes el concepto, necesitas re-explicación`,
          confidence: 90
        };
      } else {
        return {
          type: RecommendationType.REFUERZO_PRÁCTICA,
          contentId: skillId,
          lessonType: 'practice_set',
          reason: `Necesitas más práctica (accuracy: ${signals.accuracy}%)`,
          confidence: 85
        };
      }
    }

    // ===== CONDICIÓN 3: ¿Estudiante domina muy rápido? =====
    // Prioridad: MEDIA
    if (
      signals.consistency > 85 &&
      signals.accuracy > 88 &&
      signals.learningVelocity === 'fast'
    ) {
      const challengeSkill = await this.findOptionalChallengeSkill(db, studentId);
      if (challengeSkill) {
        return {
          type: RecommendationType.DESAFÍO_OPCIONAL,
          contentId: challengeSkill.id,
          lessonType: 'challenge_problem',
          reason: `Vas muy rápido, aquí hay desafío adicional`,
          confidence: 70
        };
      }

      const nextLessonAccelerated = await this.getNextLessonIfPrereqMet(db, studentId);
      if (nextLessonAccelerated) {
        return {
          type: RecommendationType.NEXT_LESSON,
          contentId: nextLessonAccelerated.id,
          lessonType: 'next_lesson_accelerated',
          reason: `Adelantamos una lección`,
          confidence: 75
        };
      }
    }

    // ===== CONDICIÓN 4: ¿Hay skill nueva que necesita refuerzo preventivo? =====
    // Prioridad: BAJA
    const skillNeedingRefresh = await this.findSkillNeedingRefreshAfterDays(db, studentId, 21);
    if (skillNeedingRefresh) {
      return {
        type: RecommendationType.REFUERZO_PRÁCTICA,
        contentId: skillNeedingRefresh.id,
        lessonType: 'practice_set',
        reason: `Refuerzo preventivo: ${skillNeedingRefresh.name}`,
        confidence: 60
      };
    }

    // ===== DEFECTO: SEGUIR CURRICULUM (85% del tiempo) =====
    const nextLesson = await this.getNextLessonInCurriculum(db, studentId);

    if (!nextLesson) {
      return {
        type: RecommendationType.NEXT_LESSON,
        contentId: 'END_OF_CURRICULUM',
        lessonType: 'promotion_exam',
        reason: `¡Completaste el currículo! Listo para modo autónomo`,
        confidence: 100
      };
    }

    // Verificar prerequisitos
    const prereqStatus = await this.checkPrerequisites(db, nextLesson);

    if (prereqStatus.allMet) {
      return {
        type: RecommendationType.NEXT_LESSON,
        contentId: nextLesson.id,
        lessonType: 'next_lesson',
        reason: `Siguiente en tu camino`,
        confidence: 95
      };
    }

    // Hay prerequisitos no dominados
    const missingPrereq = prereqStatus.missing[0];

    if (missingPrereq.mastery > 70) {
      // Casi dominado = permitir con advertencia
      return {
        type: RecommendationType.NEXT_LESSON,
        contentId: nextLesson.id,
        lessonType: 'next_lesson_with_warning',
        reason: `Adelantamos, pero revisa ${missingPrereq.name}`,
        confidence: 60,
        suggestedActions: ['Revisar ' + missingPrereq.name]
      };
    } else {
      // Muy lejos = refuerzo
      if (missingPrereq.criticality === SkillCriticality.CORE) {
        return {
          type: RecommendationType.REFUERZO_BLOQUEANTE,
          contentId: missingPrereq.id,
          lessonType: 'mandatory_practice',
          reason: `Necesitas dominar ${missingPrereq.name} primero (criticidad: CORE)`,
          confidence: 100
        };
      } else {
        return {
          type: RecommendationType.REFUERZO_PRÁCTICA,
          contentId: missingPrereq.id,
          lessonType: 'recommended_practice',
          reason: `Recomendamos practicar ${missingPrereq.name} primero`,
          confidence: 80
        };
      }
    }
  }

  // === MÉTODOS AUXILIARES ===

  private async findMostAtRiskSkill(db: any, studentId: string) {
    if (db.findMostAtRiskSkill) return db.findMostAtRiskSkill(studentId);
    return null;
  }

  private async findOptionalChallengeSkill(db: any, studentId: string) {
    if (db.findOptionalChallengeSkill) return db.findOptionalChallengeSkill(studentId);
    return null;
  }

  private async getNextLessonIfPrereqMet(db: any, studentId: string) {
    const nextLesson = await db.getNextLessonInCurriculum(studentId);
    if (!nextLesson) return null;

    const prereqMet = await this.checkPrerequisites(db, nextLesson);
    return prereqMet.allMet ? nextLesson : null;
  }

  private async findSkillNeedingRefreshAfterDays(db: any, studentId: string, days: number) {
    if (db.findSkillNeedingRefreshAfterDays) return db.findSkillNeedingRefreshAfterDays(studentId, days);
    return null;
  }

  private async getNextLessonInCurriculum(db: any, studentId: string) {
    if (db.getNextLessonInCurriculum) return db.getNextLessonInCurriculum(studentId);
    return null;
  }

  private async checkPrerequisites(db: any, lesson: any) {
    if (!db.getLessonSkills) return { allMet: true, missing: [] };
    
    const skillsInLesson = await db.getLessonSkills(lesson.id);
    const allPrereqs: any[] = [];
    const missing: any[] = [];

    for (const skill of skillsInLesson) {
      const prereqs = await db.getPrerequisites(skill.id);
      allPrereqs.push(...prereqs);
    }

    for (const prereq of allPrereqs) {
      const studentMastery = await db.getUserSkillMastery(undefined, prereq.id); // assume user is bound
      if (!studentMastery || studentMastery.mastery_level < 70) {
        missing.push(prereq);
      }
    }

    return {
      allMet: missing.length === 0,
      missing
    };
  }
}
