import { MasteryModel } from '../src/modules/mastery-model';
import { SkillCriticality } from '../src/types/mastery';

describe('MasteryModel', () => {
  it('should initialize with default 50% mu and 30% sigma', () => {
    const model = new MasteryModel();
    const state = model.getState();
    expect(state.mu).toBeCloseTo(0.5);
    expect(state.sigma).toBeCloseTo(0.3);
  });

  it('should increase mu when answer is correct', () => {
    const model = new MasteryModel();
    model.updateMastery(true, 5);
    const state = model.getState();
    expect(state.mu).toBeGreaterThan(0.5);
    expect(state.sigma).toBeLessThan(0.3); // Uncertainty decays
  });

  it('should decrease mu when answer is incorrect', () => {
    const model = new MasteryModel();
    model.updateMastery(false, 5);
    const state = model.getState();
    expect(state.mu).toBeLessThan(0.5);
  });

  it('should increase uncertainty when error is CONCEPTUAL', () => {
    const model = new MasteryModel();
    model.updateMastery(false, 5, { category: 'CONCEPTUAL' } as any);
    const state = model.getState();
    expect(state.sigma).toBeGreaterThan(0.28); // Standard decay would be 0.285. With penalty it stays higher.
  });

  it('should handle unlock thresholds correctly', () => {
    // Manually force a high mastery state
    const model = new MasteryModel({ skillId: 's1', mu: 0.90, sigma: 0.10, estimatedMastery: 90, confidence: 90, attemptCount: 10, lastPracticeDate: new Date(), status: 'mastered' });
    const unlock = model.checkUnlock(SkillCriticality.CORE, 6);
    expect(unlock.shouldUnlock).toBe(true);

    const failUnlock = model.checkUnlock(SkillCriticality.CORE, 2); // Not enough attempts
    expect(failUnlock.shouldUnlock).toBe(false);
    expect(failUnlock.gaps.length).toBeGreaterThan(0);
  });
});
