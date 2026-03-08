import { AdaptiveEngine } from '../src/modules/adaptive-engine';
import { RecommendationType, Signals } from '../src/types/adaptive';
import { SkillCriticality } from '../src/types/mastery';

describe('AdaptiveEngine', () => {
  let engine: AdaptiveEngine;

  beforeEach(() => {
    engine = new AdaptiveEngine();
  });

  const baseSignals: Signals = {
    accuracy: 80,
    consistency: 80,
    retentionRisk: 10,
    predictedFailure: 10,
    learningVelocity: 'normal',
    masteryConfidence: 80
  };

  it('should recommend spaced repetition if retention risk is critical', async () => {
    const signals = { ...baseSignals, retentionRisk: 85 };
    const db = {
      findMostAtRiskSkill: async () => ({ id: 's2', name: 'Fractions' })
    };

    const rec = await engine.recommend({
      studentId: 'u1',
      skillId: 's1',
      signals,
      skillCriticality: SkillCriticality.CORE
    }, db);

    expect(rec.type).toBe(RecommendationType.SPACED_REPETITION);
    expect(rec.contentId).toBe('s2');
  });

  it('should recommend conceptual review if accuracy is low and error is conceptual', async () => {
    const signals = { ...baseSignals, accuracy: 50, errorType: 'CONCEPTUAL' };
    const rec = await engine.recommend({
      studentId: 'u1',
      skillId: 's1',
      signals,
      skillCriticality: SkillCriticality.CORE
    }, {});

    expect(rec.type).toBe(RecommendationType.REFUERZO_CONCEPTUAL);
    expect(rec.contentId).toBe('s1');
  });

  it('should recommend next lesson by default if signals are fine', async () => {
    const db = {
      getNextLessonInCurriculum: async () => ({ id: 'lsn1' }),
      getLessonSkills: async () => [{id: 's2'}],
      getPrerequisites: async () => [], // No prereqs
      getUserSkillMastery: async () => ({ mastery_level: 100 })
    };

    const rec = await engine.recommend({
      studentId: 'u1',
      skillId: 's1',
      signals: baseSignals,
      skillCriticality: SkillCriticality.CORE
    }, db);

    expect(rec.type).toBe(RecommendationType.NEXT_LESSON);
    expect(rec.contentId).toBe('lsn1');
  });
});
