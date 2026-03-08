import { AITutor, createAITutor } from '../src/modules/ai-tutor';
import { OllamaService } from '../src/services/ollama-service';
import { TutorContext, ProblemStatement, Skill, StudentSignals } from '../src/types';

const mockOllama = {
  generateResponse: jest.fn(),
  validateConnection: jest.fn(),
} as unknown as OllamaService;

const mockProblem: ProblemStatement = {
  id: 'p1',
  skillId: 's1',
  difficulty: 5,
  statement: 'Resuelve: 2x + 5 = 13',
  correctAnswer: 'x = 4',
};

const mockSkill: Skill = {
  id: 's1',
  name: 'Ecuaciones lineales',
  description: 'Primer grado',
  domain: 'algebra',
  difficulty: 5,
  prerequisites: [],
};

const mockSignals: StudentSignals = {
  accuracy: 75, consistency: 70, retentionRisk: 20,
  predictedFailure: 25, learningVelocity: 'normal', masteryConfidence: 70,
};

const mockContext: TutorContext = {
  studentId: 'u1',
  skillId: 's1',
  skillName: 'Ecuaciones lineales',
  problem: mockProblem,
  studentAnswer: 'x = 16',
  mastery: { mu: 0.6, sigma: 0.2, estimatedMastery: 60, confidence: 80, attemptCount: 3 },
  signals: mockSignals,
  conversationHistory: [],
  attemptNumber: 2,
  previousHints: [],
};

describe('AITutor Orchestrator', () => {
  let tutor: AITutor;

  beforeEach(() => {
    tutor = createAITutor(mockOllama);
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should return a guidance response and update history', async () => {
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue('¿Qué pasa si restas 5 en ambos lados?');
      
      const response = await tutor.chat('u1', 'No sé cómo seguir', mockContext);
      
      expect(response.type).toBe('guidance');
      expect(response.content).toContain('restas 5');
      expect(mockContext.conversationHistory).toHaveLength(2);
      expect(mockContext.conversationHistory[0].role).toBe('student');
      expect(mockContext.conversationHistory[1].role).toBe('tutor');
    });

    it('should throw error if problem is missing from context', async () => {
      const invalidCtx = { ...mockContext, problem: undefined } as any;
      await expect(tutor.chat('u1', 'help', invalidCtx)).rejects.toThrow('Context must include problem');
    });
  });

  describe('explainProblem', () => {
    it('should call explanation engine', async () => {
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Explicación de prueba');
      const result = await tutor.explainProblem(mockProblem, 'x = 16', 'CONCEPTUAL', 60, mockSkill);
      expect(result.mainExplanation).toContain('Explicación de prueba');
    });
  });

  describe('generateHint', () => {
    it('should call hint generator', async () => {
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Pista de prueba');
      const result = await tutor.generateHint(mockProblem, 1, [], 60, 1);
      expect(result.hint).toContain('Pista de prueba');
    });
  });

  describe('generatePracticeExercise', () => {
    it('should call exercise generator', async () => {
      const mockExercise = JSON.stringify({
        id: 'gen_123',
        skillId: 's1',
        difficulty: 5,
        statement: 'Nuevo problema',
        correctAnswer: '42',
        solutionSteps: ['step 1'],
      });
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue(mockExercise);
      
      const result = await tutor.generatePracticeExercise(mockSkill, 5, 60);
      expect(result.statement).toBe('Nuevo problema');
    });
  });

  describe('decideTutoringStrategy', () => {
    it('should call strategy engine', async () => {
      const mockStrategy = JSON.stringify({
        approach: 'socratic',
        explanationDepth: 'moderate',
        hintAggressiveness: 'moderate',
        exampleCount: 2,
        focusAreas: ['math'],
        languageLevel: 'intermediate',
        recommendedNextAction: 'action',
      });
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue(mockStrategy);
      
      const result = await tutor.decideTutoringStrategy(mockSignals, 'CONCEPTUAL', 60);
      expect(result.approach).toBe('socratic');
    });
  });
});
