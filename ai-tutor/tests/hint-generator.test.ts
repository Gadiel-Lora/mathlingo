import { HintGenerator } from '../src/modules/hint-generator';
import { PromptBuilder } from '../src/modules/prompt-builder';
import { OllamaService } from '../src/services/ollama-service';
import { ProblemStatement } from '../src/types';

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

describe('HintGenerator', () => {
  let generator: HintGenerator;

  beforeEach(() => {
    generator = new HintGenerator(mockOllama, new PromptBuilder());
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue(
      'Fíjate en el coeficiente de x. ¿Qué operación usarías?'
    );
    jest.clearAllMocks();
  });

  it('should return hintLevel 1 hint', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('¿Qué operación es lo opuesto de la suma?');
    const result = await generator.generateHint(mockProblem, 0, [], 60, 1);
    expect(result.hintLevel).toBe(1);
    expect(result.hint).toContain('opuesto');
  });

  it('should return hintLevel 3 ending with question if no ? present', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Hasta aquí tenemos 2x = 8');
    const result = await generator.generateHint(mockProblem, 2, [], 50, 3);
    expect(result.hintLevel).toBe(3);
    expect(result.hint).toContain('?'); // Should append question
  });

  it('should mark as socratic for high mastery + no previous hints', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('¿Qué haces cuando tienes un coeficiente?');
    const result = await generator.generateHint(mockProblem, 0, [], 80, 1);
    expect(result.isSocraticQuestion).toBe(true);
  });

  it('should not be socratic for low mastery', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Debes dividir ambos lados por 2.');
    const result = await generator.generateHint(mockProblem, 0, [], 30, 2);
    expect(result.isSocraticQuestion).toBe(false);
  });

  it('should include followUpGuidance', async () => {
    (mockOllama.generateResponse as jest.Mock).mockResolvedValue('Considera el coeficiente.');
    const result = await generator.generateHint(mockProblem, 0, [], 60, 1);
    expect(result.followUpGuidance).toBeTruthy();
  });
});
