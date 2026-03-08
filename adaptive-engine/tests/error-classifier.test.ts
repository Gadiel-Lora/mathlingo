import { ErrorClassifier, ClassificationInput } from '../src/modules/error-classifier';
import { ErrorCategory } from '../src/types/errors';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('Arithmetic Errors', () => {
    it('should classify arithmetic error when numbers are close', async () => {
      const input: ClassificationInput = {
        problem: {
          statement: 'Calcula: 7 × 8',
          correctAnswer: '56',
          expectedNotation: /\d+/
        },
        studentAnswer: '54'
      };

      const result = await classifier.classify(input);

      expect(result.category).toBe(ErrorCategory.ARITHMETIC);
      expect(result.confidence).toBe(95);
    });
  });

  describe('Conceptual Errors', () => {
    it('should classify as conceptual when logic breaks down', async () => {
      const input: ClassificationInput = {
        problem: {
          statement: 'Resuelve: 2x + 5 = 13',
          correctAnswer: 'x = 4',
          correctSteps: ['2x = 8', 'x = 4']
        },
        studentAnswer: 'x = 16',
        attemptDetails: {
          stepsProvided: ['2x = 8', 'x = 16']
        }
      };

      const result = await classifier.classify(input);

      expect(result.category).toBe(ErrorCategory.CONCEPTUAL);
      expect(result.severity).toBe('critical');
    });
  });

  describe('Procedural Errors', () => {
    it('should classify as procedural when steps are out of order', async () => {
      const input: ClassificationInput = {
        problem: {
          statement: 'Factoriza',
          correctAnswer: '(x+2)(x+3)',
          correctSteps: ['step1', 'step2', 'step3']
        },
        studentAnswer: 'incorrect',
        attemptDetails: {
          stepsProvided: ['step1', 'step3', 'step2'] // Wrong order
        }
      };

      const result = await classifier.classify(input);

      expect(result.category).toBe(ErrorCategory.PROCEDURAL);
      expect(result.severity).toBe('medium');
    });
  });

  describe('Notational Errors', () => {
    it('should classify as notational if regex fails', async () => {
        const input: ClassificationInput = {
          problem: {
            statement: 'Escribe 1/2',
            correctAnswer: '1/2',
            expectedNotation: /^[0-9]+\/[0-9]+$/
          },
          studentAnswer: '0.5' // Fails regex for fraction
        };
  
        const result = await classifier.classify(input);
        expect(result.category).toBe(ErrorCategory.NOTATIONAL);
    });
  });
});
