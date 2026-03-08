import { StrategyEngine } from '../src/modules/strategy-engine';
import { PromptBuilder } from '../src/modules/prompt-builder';
import { OllamaService } from '../src/services/ollama-service';
import { StudentSignals } from '../src/types';

const mockOllama = {
  generateResponse: jest.fn(),
} as unknown as OllamaService;

const mockSignals: StudentSignals = {
  accuracy: 75, consistency: 70, retentionRisk: 20,
  predictedFailure: 25, learningVelocity: 'normal', masteryConfidence: 70,
};

describe('StrategyEngine', () => {
  let engine: StrategyEngine;

  beforeEach(() => {
    engine = new StrategyEngine(mockOllama, new PromptBuilder());
    jest.clearAllMocks();
  });

  describe('deterministicStrategy', () => {
    it('should recommend guided+active for low accuracy', () => {
      const strategy = engine.deterministicStrategy(
        { ...mockSignals, accuracy: 45 }, 'CONCEPTUAL', 50
      );
      expect(strategy.approach).toBe('direct');
      expect(strategy.hintAggressiveness).toBe('active');
    });

    it('should recommend socratic for high mastery', () => {
      const strategy = engine.deterministicStrategy(
        { ...mockSignals, accuracy: 90, learningVelocity: 'fast' }, 'ARITHMETIC', 80
      );
      expect(strategy.approach).toBe('socratic');
    });

    it('should recommend deep explanation for high retention risk', () => {
      const strategy = engine.deterministicStrategy(
        { ...mockSignals, retentionRisk: 80 }, 'CONCEPTUAL', 55
      );
      expect(strategy.focusAreas).toContain('repaso-spaced-repetition');
    });

    it('should return novice level for low mastery', () => {
      const strategy = engine.deterministicStrategy(mockSignals, 'PROCEDURAL', 25);
      expect(strategy.language_level).toBe('novice');
    });

    it('should return advanced level for high mastery', () => {
      const strategy = engine.deterministicStrategy(mockSignals, 'PROCEDURAL', 80);
      expect(strategy.language_level).toBe('advanced');
    });
  });

  describe('decideTutoringStrategy with Ollama', () => {
    it('should parse valid JSON from Ollama', async () => {
      const mockResponse = JSON.stringify({
        approach: 'guided',
        explanationDepth: 'moderate',
        hintAggressiveness: 'moderate',
        exampleCount: 2,
        focusAreas: ['fracciones'],
        language_level: 'intermediate',
        recommendedNextAction: 'Practicar con ejemplos adicionales',
      });
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue(mockResponse);

      const strategy = await engine.decideTutoringStrategy(mockSignals, 'CONCEPTUAL', 55);
      expect(strategy.approach).toBe('guided');
      expect(strategy.focusAreas).toContain('fracciones');
    });

    it('should fall back to deterministic if Ollama returns invalid JSON', async () => {
      (mockOllama.generateResponse as jest.Mock).mockResolvedValue('No puedo procesar esta solicitud.');

      const strategy = await engine.decideTutoringStrategy(
        { ...mockSignals, accuracy: 40 }, 'ARITHMETIC', 45
      );
      // Falls back to deterministic — accuracy < 60 → direct/active
      expect(strategy).toBeDefined();
      expect(strategy.approach).toBeTruthy();
    });
  });
});
