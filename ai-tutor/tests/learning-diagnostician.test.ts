
import { LearningDiagnostician } from '../src/modules/learning-diagnostician';
import { PromptBuilder } from '../src/modules/prompt-builder';
import { OllamaService } from '../src/services/ollama-service';
import { ProblemStatement, SkillData } from '../src/types';

const mockOllama = {
  generateResponse: jest.fn(),
} as unknown as OllamaService;

const mockProblem: ProblemStatement = {
  id: 'p1',
  skillId: 's1',
  difficulty: 5,
  statement: 'Resuelve: 2x + 5 = 13',
  correctAnswer: 'x = 4',
  solutionSteps: ['2x = 8', 'x = 4'],
};

describe('LearningDiagnostician', () => {
  let diagnostician: LearningDiagnostician;

  beforeEach(() => {
    diagnostician = new LearningDiagnostician(mockOllama, new PromptBuilder());
    jest.clearAllMocks();
  });

  it('parses valid diagnostic JSON', async () => {
    const response = JSON.stringify({
      conceptsGrasped: ['ecuaciones'],
      conceptsMissing: ['aislar x'],
      rootCause: 'confusion en pasos',
      procedureStrength: 55,
      conceptualDepth: 50,
      transferability: 45,
      isRecurring: false,
      errorPattern: 'conceptual',
      primaryWeakness: 'aislamiento',
      secondaryWeaknesses: [],
      strengths: ['algebra basica'],
      recommendation: 'repasar pasos',
    });
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(response);

    const analysis = await diagnostician.analyzeLearningGaps(
      'x = 16',
      mockProblem,
      'x = 4',
      'CONCEPTUAL',
      60,
      ['CONCEPTUAL'],
      'u1'
    );

    expect(analysis.rootCause).toBe('confusion en pasos');
    expect(analysis.conceptsMissing).toContain('aislar x');
  });

  it('falls back when JSON is invalid', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('no-json');

    const analysis = await diagnostician.analyzeLearningGaps(
      'x = 16',
      mockProblem,
      'x = 4',
      'CONCEPTUAL',
      30,
      ['CONCEPTUAL'],
      'u1'
    );

    expect(analysis.recommendation).toBeTruthy();
  });

  it('builds learning profile from LLM response', async () => {
    const response = JSON.stringify({
      learningProfile: {
        preferredExplanationStyle: 'visual',
        learningSpeed: 'normal',
        confidenceLevel: 'medium',
        strengths: [{ skill: 'Ecuaciones', masteryLevel: 80 }],
        challenges: [{ skill: 'Fracciones', masteryLevel: 40, primaryIssue: 'conceptual' }],
        patterns: { improvingAreas: [], stuckAreas: [], errorTrend: 'estable', consistencyScore: 60 },
      },
      recommendations: {
        immediate: { skill: 'Fracciones', reason: 'refuerzo', urgency: 'high' },
        shortTerm: { focusArea: 'Fracciones', skills: ['Fracciones'], estimatedWeeks: 2 },
        learningPath: { phase1_foundation: ['Fracciones'], phase2_intermediate: [], phase3_advanced: [] },
      },
    });
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(response);

    const completedSkills: SkillData[] = [
      { skillId: 's1', skillName: 'Ecuaciones', masteryLevel: 80 },
    ];

    const profile = await diagnostician.buildLearningProfile('u1', completedSkills, [], []);
    expect(profile.learningProfile?.preferredExplanationStyle).toBe('visual');
  });
});

