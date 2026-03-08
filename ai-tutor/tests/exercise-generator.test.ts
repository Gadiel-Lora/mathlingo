import { ExerciseGenerator } from '../src/modules/exercise-generator';
import { PromptBuilder } from '../src/modules/prompt-builder';
import { OllamaService } from '../src/services/ollama-service';
import { Skill } from '../src/types';

const mockOllama = {
  generateResponse: jest.fn(),
} as unknown as OllamaService;

const mockSkill: Skill = {
  id: 's1',
  name: 'Ecuaciones lineales',
  description: 'Primer grado',
  domain: 'algebra',
  difficulty: 5,
  prerequisites: [],
};

const validExerciseJSON = JSON.stringify({
  id: 'gen_123',
  skillId: 's1',
  difficulty: 5,
  statement: 'Resuelve: 3x + 2 = 11',
  correctAnswer: 'x = 3',
  solutionSteps: ['3x = 9', 'x = 3'],
  keyConceptsTested: ['ecuaciones-lineales'],
  estimatedTimeMinutes: 3,
  difficultyRationale: 'Un paso básico de despeje',
});

describe('ExerciseGenerator', () => {
  let generator: ExerciseGenerator;

  beforeEach(() => {
    generator = new ExerciseGenerator(mockOllama, new PromptBuilder());
    jest.clearAllMocks();
  });

  it('should parse valid JSON exercise from Ollama', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(validExerciseJSON);
    const exercise = await generator.generateExercise(mockSkill, 5, 60);
    expect(exercise.statement).toContain('3x + 2 = 11');
    expect(exercise.correctAnswer).toBe('x = 3');
    expect(exercise.solutionSteps).toHaveLength(2);
  });

  it('should tag exercise with errorType weakness', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(validExerciseJSON);
    const exercise = await generator.generateExercise(mockSkill, 5, 60, [], 'ARITHMETIC');
    expect(exercise.keyConceptsTested).toContain('precisión-aritmética');
  });

  it('should fallback gracefully on invalid JSON', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Aquí tienes un ejercicio: 2+2');
    await expect(generator.generateExercise(mockSkill, 5, 60)).rejects.toThrow('validation');
  });

  it('should include solutionSteps when parsed', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(validExerciseJSON);
    const exercise = await generator.generateExercise(mockSkill, 5, 60);
    expect(Array.isArray(exercise.solutionSteps)).toBe(true);
    expect(exercise.solutionSteps.length).toBeGreaterThan(0);
  });
});
