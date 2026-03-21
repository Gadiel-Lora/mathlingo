import { Router, Request, Response, NextFunction } from 'express';
import { createAITutor } from '../modules/ai-tutor';
import { LearningDiagnostician } from '../modules/learning-diagnostician';
import { AdaptiveCoachingEngine } from '../modules/adaptive-coaching-engine';
import { AdaptivePathRecommender } from '../modules/adaptive-path-recommender';
import { PromptBuilder } from '../modules/prompt-builder';
import { OllamaService } from '../services/ollama-service';
import { TutorContext } from '../types';

const router = Router();
const aiTutor = createAITutor();
const ollama = new OllamaService();
const promptBuilder = new PromptBuilder();
const learningDiagnostician = new LearningDiagnostician(ollama, promptBuilder);
const adaptiveCoachingEngine = new AdaptiveCoachingEngine(ollama, promptBuilder);
const adaptivePathRecommender = new AdaptivePathRecommender(ollama, promptBuilder);

// Auth middleware stub — replace with real JWT validation
function authenticate(req: Request & { user?: { id: string } }, res: Response, next: NextFunction): void {
  req.user = { id: (req.headers['x-user-id'] as string) || 'anonymous' };
  next();
}

type AuthRequest = Request & { user?: { id: string } };

/**
 * POST /api/ai-tutor/chat
 * Student sends a message, AI responds conversationally via Socratic method.
 *
 * Body: { studentMessage: string, context: TutorContext }
 */
router.post('/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { studentMessage, context } = req.body as { studentMessage: string; context: TutorContext };
    const userId = req.user?.id ?? 'anonymous';

    if (!studentMessage) {
      res.status(400).json({ error: 'studentMessage is required' });
      return;
    }

    const response = await aiTutor.chat(userId, studentMessage, context);
    res.json({ success: true, response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/explain
 * Explains a problem adapted to student mastery and error type.
 *
 * Body: { problem, studentAnswer, errorType, masteryLevel, skill }
 */
router.post('/explain', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { problem, studentAnswer, errorType, masteryLevel, skill } = req.body;

    if (!problem || !studentAnswer || !errorType || masteryLevel === undefined || !skill) {
      res.status(400).json({ error: 'Missing required fields: problem, studentAnswer, errorType, masteryLevel, skill' });
      return;
    }

    const explanation = await aiTutor.explainProblem(
      problem, studentAnswer, errorType, masteryLevel, skill
    );
    res.json({ success: true, explanation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/hint
 * Returns a progressive hint (level 1, 2, or 3).
 *
 * Body: { problem, currentStep, previousHints, masteryLevel, hintLevel }
 */
router.post('/hint', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { problem, currentStep, previousHints, masteryLevel, hintLevel } = req.body;

    if (!problem || masteryLevel === undefined || ![1, 2, 3].includes(hintLevel)) {
      res.status(400).json({ error: 'Missing required fields: problem, masteryLevel, hintLevel (1|2|3)' });
      return;
    }

    const hint = await aiTutor.generateHint(
      problem,
      currentStep ?? 0,
      previousHints ?? [],
      masteryLevel,
      hintLevel as 1 | 2 | 3
    );
    res.json({ success: true, hint });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/exercise
 * Generates a new practice exercise tailored to the student.
 *
 * Body: { skill, difficulty, masteryLevel, previousExercises?, errorType? }
 */
router.post('/exercise', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { skill, difficulty, masteryLevel, previousExercises, errorType } = req.body;

    if (!skill || difficulty === undefined || masteryLevel === undefined) {
      res.status(400).json({ error: 'Missing required fields: skill, difficulty, masteryLevel' });
      return;
    }

    const exercise = await aiTutor.generatePracticeExercise(
      skill, difficulty, masteryLevel, previousExercises, errorType
    );
    res.json({ success: true, exercise });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/strategy
 * Determines the optimal tutoring strategy based on student signals.
 *
 * Body: { signals, errorType, masteryLevel }
 */
router.post('/strategy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { signals, errorType, masteryLevel } = req.body;

    if (!signals || !errorType || masteryLevel === undefined) {
      res.status(400).json({ error: 'Missing required fields: signals, errorType, masteryLevel' });
      return;
    }

    const strategy = await aiTutor.decideTutoringStrategy(signals, errorType, masteryLevel);
    res.json({ success: true, strategy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * POST /api/ai-tutor/diagnose-learning-gaps
 * Deep diagnostics for learning gaps.
 */
router.post('/diagnose-learning-gaps', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { studentResponse, problem, correctAnswer, errorType, masteryLevel, recentErrors } = req.body;
    const userId = req.user?.id ?? 'anonymous';

    if (!studentResponse || !problem || !correctAnswer || !errorType || masteryLevel === undefined) {
      res.status(400).json({ error: 'Missing required fields: studentResponse, problem, correctAnswer, errorType, masteryLevel' });
      return;
    }

    const analysis = await learningDiagnostician.analyzeLearningGaps(
      studentResponse,
      problem,
      correctAnswer,
      errorType,
      masteryLevel,
      Array.isArray(recentErrors) ? recentErrors : [],
      userId
    );

    res.json({ success: true, analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/build-profile
 * Build a comprehensive learning profile.
 */
router.post('/build-profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id ?? 'anonymous';
    const { completedSkills, errorPatterns, improvementTrends } = req.body;

    if (!Array.isArray(completedSkills) || !Array.isArray(errorPatterns) || !Array.isArray(improvementTrends)) {
      res.status(400).json({ error: 'Missing required arrays: completedSkills, errorPatterns, improvementTrends' });
      return;
    }

    const profile = await learningDiagnostician.buildLearningProfile(
      userId,
      completedSkills,
      errorPatterns,
      improvementTrends
    );

    res.json({ success: true, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/coaching-feedback
 * Adaptive coaching feedback based on profile and diagnostics.
 */
router.post('/coaching-feedback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { profile, problem, studentAnswer, errorType, diagnostics } = req.body;

    if (!profile || !problem || !studentAnswer || !errorType || !diagnostics) {
      res.status(400).json({ error: 'Missing required fields: profile, problem, studentAnswer, errorType, diagnostics' });
      return;
    }

    const feedback = await adaptiveCoachingEngine.provideCoachingFeedback(
      profile,
      problem,
      studentAnswer,
      errorType,
      diagnostics
    );

    res.json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/tutoring-strategy
 * Decide tutoring strategy based on current signals.
 */
router.post('/tutoring-strategy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { masteryLevel, consistency, confidenceLevel, learningVelocity } = req.body;

    if (masteryLevel === undefined || consistency === undefined || !confidenceLevel || !learningVelocity) {
      res.status(400).json({ error: 'Missing required fields: masteryLevel, consistency, confidenceLevel, learningVelocity' });
      return;
    }

    const strategy = await adaptiveCoachingEngine.decideTutoringStrategy(
      masteryLevel,
      consistency,
      confidenceLevel,
      learningVelocity
    );

    res.json({ success: true, strategy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/personalized-path
 * Get personalized learning path.
 */
router.post('/personalized-path', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { profile, allSkills, skillGraph } = req.body;

    if (!profile || !Array.isArray(allSkills) || !skillGraph) {
      res.status(400).json({ error: 'Missing required fields: profile, allSkills, skillGraph' });
      return;
    }

    const pathRecommendation = await adaptivePathRecommender.recommendPersonalizedPath(
      profile,
      allSkills,
      skillGraph
    );

    res.json({ success: true, pathRecommendation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-tutor/targeted-practice
 * Suggest targeted practice based on weaknesses.
 */
router.post('/targeted-practice', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { profile, weaknessAreas } = req.body;

    if (!profile || !Array.isArray(weaknessAreas)) {
      res.status(400).json({ error: 'Missing required fields: profile, weaknessAreas' });
      return;
    }

    const practicePlan = await adaptiveCoachingEngine.suggestTargetedPractice(
      profile,
      weaknessAreas
    );

    res.json({ success: true, practicePlan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
export default router;

