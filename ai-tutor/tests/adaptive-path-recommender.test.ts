
import { AdaptivePathRecommender } from '../src/modules/adaptive-path-recommender';
import { PromptBuilder } from '../src/modules/prompt-builder';
import { OllamaService } from '../src/services/ollama-service';
import { StudentLearningProfile, Skill, SkillGraph } from '../src/types';

const mockOllama = {
  generateResponse: jest.fn(),
} as unknown as OllamaService;

const mockSkills: Skill[] = [
  {
    id: 's1',
    name: 'Ecuaciones lineales',
    description: 'Primer grado',
    domain: 'algebra',
    difficulty: 5,
    prerequisites: [],
  },
  {
    id: 's2',
    name: 'Sistemas',
    description: 'Sistemas basicos',
    domain: 'algebra',
    difficulty: 6,
    prerequisites: ['s1'],
  },
];

const mockGraph: SkillGraph = {
  edges: [{ from: 's1', to: 's2' }],
};

const mockProfile: StudentLearningProfile = {
  learningProfile: {
    preferredExplanationStyle: 'mixed',
    learningSpeed: 'normal',
    confidenceLevel: 'medium',
    strengths: [{ skill: 'Ecuaciones lineales', masteryLevel: 85 }],
    challenges: [{ skill: 'Sistemas', masteryLevel: 45, primaryIssue: 'conceptual' }],
    patterns: { improvingAreas: [], stuckAreas: [], errorTrend: 'estable', consistencyScore: 60 },
  },
};

describe('AdaptivePathRecommender', () => {
  let recommender: AdaptivePathRecommender;

  beforeEach(() => {
    recommender = new AdaptivePathRecommender(mockOllama, new PromptBuilder());
    jest.clearAllMocks();
  });

  it('parses personalized path JSON', async () => {
    const response = JSON.stringify({
      personalizedPath: {
        criticalGaps: [{ skill: 'Sistemas', urgency: 'high', reason: 'prereq' }],
        strengths: { readyForAdvanced: ['Ecuaciones lineales'], canTeachOthers: [] },
        recommendedSequence: {
          phase1_foundation: ['Sistemas'],
          phase2_consolidation: ['Ecuaciones lineales'],
          phase3_advancement: [],
        },
        alternativePaths: {
          ifPreferencesVisual: [],
          ifPreferencesAlgebraic: [],
          ifPreferencesContextual: [],
        },
        estimatedTimeline: {
          readyForNextGrade: '2026-06-01',
          readyForAdvancedChallenges: '2026-05-20',
          estimatedMasteryCompletion: '2026-07-01',
        },
        rationale: 'test',
      },
    });
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(response);

    const rec = await recommender.recommendPersonalizedPath(mockProfile, mockSkills, mockGraph);
    expect(rec.personalizedPath.criticalGaps[0].skill).toBe('Sistemas');
  });

  it('falls back when JSON is invalid', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('no-json');

    const rec = await recommender.recommendPersonalizedPath(mockProfile, mockSkills, mockGraph);
    expect(rec.personalizedPath).toBeDefined();
    expect(rec.personalizedPath.recommendedSequence.phase1_foundation).toBeDefined();
  });
});

