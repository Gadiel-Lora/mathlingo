import { PromptBuilder } from '../src/modules/prompt-builder';
import {
  TutorContext, ProblemStatement, Skill, StudentSignals,
} from '../src/types';

const mockProblem: ProblemStatement = {
  id: 'p1',
  skillId: 's1',
  difficulty: 5,
  statement: 'Resuelve: 2x + 5 = 13',
  correctAnswer: 'x = 4',
  solutionSteps: ['2x = 8', 'x = 4'],
};

const mockSkill: Skill = {
  id: 's1',
  name: 'Ecuaciones lineales',
  description: 'Resolver ecuaciones de primer grado',
  domain: 'algebra',
  difficulty: 5,
  prerequisites: [],
};

const mockSignals: StudentSignals = {
  accuracy: 70, consistency: 65, retentionRisk: 20,
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

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  describe('buildChatPrompt', () => {
    it('should include base tutor instructions', () => {
      const prompt = builder.buildChatPrompt({ ...mockContext, studentMessage: '¿Por qué me equivoqué?' });
      expect(prompt).toContain('tutor de matemáticas');
      expect(prompt).toContain('método socrático');
    });

    it('should include student mastery level', () => {
      const prompt = builder.buildChatPrompt({ ...mockContext, studentMessage: 'Ayuda' });
      expect(prompt).toContain('60%');
    });

    it('should include the student message', () => {
      const prompt = builder.buildChatPrompt({ ...mockContext, studentMessage: '¿Qué hice mal?' });
      expect(prompt).toContain('¿Qué hice mal?');
    });

    it('should include conversation history when present', () => {
      const ctxWithHistory: TutorContext = {
        ...mockContext,
        studentMessage: 'Sigo sin entender',
        conversationHistory: [
          { role: 'student', content: 'No entiendo', timestamp: new Date() },
          { role: 'tutor', content: '¿Qué parte no entiendes?', timestamp: new Date() },
        ],
      };
      const prompt = builder.buildChatPrompt(ctxWithHistory);
      expect(prompt).toContain('HISTORIAL DE CONVERSACIÓN');
      expect(prompt).toContain('No entiendo');
    });

    it('should use BEGINNER template for low mastery', () => {
      const ctx: TutorContext = {
        ...mockContext,
        mastery: { ...mockContext.mastery, estimatedMastery: 30 },
        studentMessage: 'Ayuda',
      };
      const prompt = builder.buildChatPrompt(ctx);
      expect(prompt).toContain('PRINCIPIANTE');
    });

    it('should use ADVANCED template for high mastery', () => {
      const ctx: TutorContext = {
        ...mockContext,
        mastery: { ...mockContext.mastery, estimatedMastery: 85 },
        studentMessage: 'Ayuda',
      };
      const prompt = builder.buildChatPrompt(ctx);
      expect(prompt).toContain('AVANZADO');
    });
  });

  describe('buildExplanationPrompt', () => {
    it('should include CONCEPTUAL error instructions', () => {
      const prompt = builder.buildExplanationPrompt(mockProblem, 'x = 16', 'CONCEPTUAL', 60, mockSkill);
      expect(prompt).toContain('CONCEPTUAL');
    });

    it('should include ARITHMETIC error instructions', () => {
      const prompt = builder.buildExplanationPrompt(mockProblem, '54', 'ARITHMETIC', 60, mockSkill);
      expect(prompt).toContain('ARITMÉTICO');
    });

    it('should include the problem statement', () => {
      const prompt = builder.buildExplanationPrompt(mockProblem, 'x = 16', 'CONCEPTUAL', 60, mockSkill);
      expect(prompt).toContain('2x + 5 = 13');
    });
  });

  describe('buildHintPrompt', () => {
    it('should include level-1 hint instructions', () => {
      const prompt = builder.buildHintPrompt(mockProblem, 1, 60);
      expect(prompt).toContain('NIVEL 1');
    });

    it('should include level-3 hint instructions', () => {
      const prompt = builder.buildHintPrompt(mockProblem, 3, 40);
      expect(prompt).toContain('NIVEL 3');
    });

    it('should include previous hints to avoid repetition', () => {
      const prompt = builder.buildHintPrompt(mockProblem, 2, 60, ['Fíjate en el coeficiente']);
      expect(prompt).toContain('Fíjate en el coeficiente');
      expect(prompt).toContain('NO las repitas');
    });
  });

  describe('buildExerciseGenerationPrompt', () => {
    it('should include skill name', () => {
      const prompt = builder.buildExerciseGenerationPrompt(mockSkill, 5, 60);
      expect(prompt).toContain('Ecuaciones lineales');
    });

    it('should lower difficulty for low mastery', () => {
      const prompt = builder.buildExerciseGenerationPrompt(mockSkill, 8, 30);
      expect(prompt).toContain('5/10'); // 8 - 3 = 5
    });

    it('should raise difficulty for high mastery', () => {
      const prompt = builder.buildExerciseGenerationPrompt(mockSkill, 5, 80);
      expect(prompt).toContain('7/10'); // 5 + 2 = 7
    });
  });

  describe('buildStrategyPrompt', () => {
    it('should include all signals in the prompt', () => {
      const prompt = builder.buildStrategyPrompt(mockSignals, 'CONCEPTUAL', 60);
      expect(prompt).toContain('Accuracy: 70%');
      expect(prompt).toContain('Consistency: 65%');
      expect(prompt).toContain('CONCEPTUAL');
    });
  });
});
