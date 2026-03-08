import { Router, Request, Response } from 'express';
import { ErrorClassifier } from '../modules/error-classifier';
import { MasteryModel } from '../modules/mastery-model';
import { AdaptiveEngine } from '../modules/adaptive-engine';
import { SignalsCalculator } from '../modules/signals-calculator';

const router = Router();

// Interfaces para mock de typings
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

// Mock DB wrapper - en producción se inyectaría
const db = {
  exercises: { findById: async (id: string) => ({ id, statement: '', correctAnswer: '42', correctSteps: [], difficulty: 5 }) },
  userSkillMastery: { findOne: async (u: string, s: string) => undefined, update: async () => {} },
  skills: { findById: async (id: string) => ({ id, criticality: 'CORE' }) }
};

const generateFeedback = (exercise: any, studentAnswer: string, errorClassification: any) => {
    if (!errorClassification) return "¡Correcto!";
    return errorClassification.reasoning || "Respuesta incorrecta.";
}

// Middleware
const authenticate = (req: AuthenticatedRequest, res: Response, next: any) => {
  // Simulando auth
  req.user = { id: 'test-user-123' };
  next();
};

/**
 * POST /api/adaptive/submit-exercise
 * 
 * Estudiante envía respuesta de ejercicio
 * Sistema clasifica, actualiza mastery, recomienda siguiente
 */
router.post('/submit-exercise', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      exerciseId,
      skillId,
      studentAnswer,
      attemptNumber,
      timeMs
    } = req.body;

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Obtener ejercicio
    const exercise = await db.exercises.findById(exerciseId);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    const isCorrect = studentAnswer === exercise.correctAnswer;

    // 2. Clasificar error
    const errorClassifier = new ErrorClassifier();
    const errorClassification = !isCorrect
      ? await errorClassifier.classify({
          problem: {
            statement: exercise.statement,
            correctAnswer: exercise.correctAnswer,
            correctSteps: exercise.correctSteps
          },
          studentAnswer,
          attemptDetails: { attemptNumber, timeMs }
        })
      : undefined;

    // 3. Actualizar mastery
    const masteryState = await db.userSkillMastery.findOne(userId, skillId);
    const masteryModel = new MasteryModel(masteryState);
    masteryModel.updateMastery(isCorrect, exercise.difficulty, errorClassification);
    const newMasteryState = masteryModel.getState();

    // Guardar en BD (Mock)
    await db.userSkillMastery.update(userId, skillId, newMasteryState);

    // 4. Calcular señales
    const signalsCalculator = new SignalsCalculator();
    const signals = await signalsCalculator.calculateSignals(
      userId,
      skillId,
      { isCorrect, difficulty: exercise.difficulty, timeMs, errorClassification },
      db
    );

    // 5. Obtener recomendación
    const adaptiveEngine = new AdaptiveEngine();
    const skill = await db.skills.findById(skillId);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    
    // Convert string to enum to satisfy TypeScript
    const skillCriticality = skill.criticality as any;

    const recommendation = await adaptiveEngine.recommend(
      {
        studentId: userId,
        skillId,
        signals,
        skillCriticality,
        lastExerciseResult: { isCorrect, errorCategory: errorClassification?.category }
      },
      db
    );

    // 6. Generar feedback
    const feedback = generateFeedback(exercise, studentAnswer, errorClassification);

    return res.json({
      success: true,
      isCorrect,
      feedback,
      mastery: newMasteryState,
      recommendation,
      signals
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/adaptive/recommendation
 * 
 * Obtiene recomendación sin completar ejercicio
 */
router.get('/recommendation', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const signalsCalculator = new SignalsCalculator();
    const signals = await signalsCalculator.calculateSignals(userId, '', {} as any, db);

    const adaptiveEngine = new AdaptiveEngine();
    const recommendation = await adaptiveEngine.recommend(
      {
        studentId: userId,
        skillId: '',
        signals,
        skillCriticality: 'CORE' as any
      },
      db
    );

    return res.json({ recommendation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
