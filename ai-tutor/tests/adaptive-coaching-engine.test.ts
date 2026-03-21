
import { AdaptiveCoachingEngine } from '../src/modules/adaptive-coaching-engine';
import { PromptBuilder } from '../src/modules/prompt-builder';
import { OllamaService } from '../src/services/ollama-service';
import { DiagnosticAnalysis, StudentLearningProfile, ProblemStatement } from '../src/types';

const mockOllama = {
  generateResponse: jest.fn(),
} as unknown as OllamaService;

const mockProblem: ProblemStatement = {
  id: 'p1',
  skillId: 's1',
  difficulty: 5,
  statement: 'Resuelve: 2x + 5 = 13',
  correctAnswer: 'x = 4',
};

const mockProfile: StudentLearningProfile = {
  learningProfile: {
    preferredExplanationStyle: 'visual',
    learningSpeed: 'normal',
    confidenceLevel: 'medium',
    strengths: [{ skill: 'Ecuaciones', masteryLevel: 80 }],
    challenges: [{ skill: 'Fracciones', masteryLevel: 40, primaryIssue: 'conceptual' }],
    patterns: { improvingAreas: [], stuckAreas: [], errorTrend: 'estable', consistencyScore: 60 },
  },
};

const mockDiagnostics: DiagnosticAnalysis = {
  conceptsGrasped: [],
  conceptsMissing: ['fracciones'],
  rootCause: 'confusion con denominadores',
  procedureStrength: 50,
  conceptualDepth: 50,
  transferability: 40,
  isRecurring: false,
  errorPattern: 'conceptual',
  primaryWeakness: 'fracciones',
  secondaryWeaknesses: [],
  strengths: [],
  recommendation: 'repaso basico',
};

describe('AdaptiveCoachingEngine', () => {
  let engine: AdaptiveCoachingEngine;

  beforeEach(() => {
    engine = new AdaptiveCoachingEngine(mockOllama, new PromptBuilder());
    jest.clearAllMocks();
  });

  it('returns guided strategy for low mastery', async () => {
    const strategy = await engine.decideTutoringStrategy(30, 40, 'low', 'slow');
    expect(strategy.approach).toBe('guided');
    expect(strategy.hintAggressiveness).toBe('active');
  });

  it('returns coaching feedback from Ollama', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Respuesta de prueba');

    const feedback = await engine.provideCoachingFeedback(
      mockProfile,
      mockProblem,
      'x = 16',
      'CONCEPTUAL',
      mockDiagnostics
    );

    expect(feedback).toContain('Respuesta de prueba');
  });

  it('parses targeted practice JSON', async () => {
    const response = JSON.stringify({
      practicePlan: {
        focus: 'Fracciones',
        urgency: 'high',
        suggestedExercises: [],
        sequence: [],
        expectedOutcome: 'Mejorar',
      },
    });
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(response);

    const plan = await engine.suggestTargetedPractice(mockProfile, ['Fracciones']);
    expect(plan.practicePlan.focus).toBe('Fracciones');
  });
});

