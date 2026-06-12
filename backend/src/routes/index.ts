import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { 
  registerSchema, loginSchema, footprintSchema, goalSchema, budgetSchema 
} from '../middleware/schemas';
import { AuthController } from '../controllers/authController';
import { FootprintController } from '../controllers/footprintController';
import { GoalController } from '../controllers/goalController';
import { GamificationController } from '../controllers/gamificationController';
import { AIController } from '../controllers/aiController';
import { OffsetController } from '../controllers/offsetController';
import { EducationController } from '../controllers/educationController';
import { SimulatorService } from '../services/simulatorService';
import { PredictionService } from '../services/predictionService';
import { dbClient } from '../repositories/dbClient';

const router = Router();

// Health Check
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==========================================
// AUTH ROUTES
// ==========================================
router.post('/auth/register', validate(registerSchema), AuthController.register);
router.post('/auth/login', validate(loginSchema), AuthController.login);
router.post('/auth/demo', AuthController.demo);
router.get('/auth/me', authMiddleware, AuthController.me);
router.put('/auth/budget', authMiddleware, validate(budgetSchema), AuthController.updateBudget);

// ==========================================
// FOOTPRINT ROUTES
// ==========================================
router.post('/footprint', authMiddleware, validate(footprintSchema), FootprintController.submitFootprint);
router.get('/footprint/history', authMiddleware, FootprintController.getHistory);

// ==========================================
// PREDICTION ROUTES
// ==========================================
router.get('/predictions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const footprints = await dbClient.getFootprintsByUserId(userId);
    const goals = await dbClient.getGoalsByUserId(userId);

    const activeGoals = goals.filter(g => g.status === 'active');
    const predictions = PredictionService.predictFutureFootprint(footprints);
    const goalProbabilities = PredictionService.predictGoalProbability(activeGoals, footprints);

    return res.status(200).json({
      predictions,
      goalProbabilities
    });
  } catch (err) {
    console.error('Predictions Route Error:', err);
    return res.status(500).json({ error: 'Failed to process predictions.' });
  }
});

// ==========================================
// GOAL ROUTES
// ==========================================
router.post('/goals', authMiddleware, validate(goalSchema), GoalController.createGoal);
router.get('/goals', authMiddleware, GoalController.listGoals);
router.put('/goals/:id', authMiddleware, GoalController.updateGoal);

// ==========================================
// GAMIFICATION ROUTES
// ==========================================
router.get('/gamification/challenges', authMiddleware, GamificationController.getChallenges);
router.post('/gamification/challenges/:id/join', authMiddleware, GamificationController.joinChallenge);
router.post('/gamification/challenges/:id/progress', authMiddleware, GamificationController.logChallengeProgress);
router.get('/gamification/leaderboard', authMiddleware, GamificationController.getLeaderboard);
router.get('/gamification/badges', authMiddleware, GamificationController.getBadges);

// ==========================================
// AI COACH & INSIGHTS ROUTES
// ==========================================
router.get('/ai/insights', authMiddleware, AIController.getInsights);
router.post('/ai/coach', authMiddleware, AIController.chatWithCoach);
router.get('/ai/report', authMiddleware, AIController.downloadReport);

// ==========================================
// CARBON OFFSETS ROUTES
// ==========================================
router.get('/offsets', authMiddleware, OffsetController.getRecommendations);

// ==========================================
// EDUCATION ROUTES
// ==========================================
router.get('/education/articles', authMiddleware, EducationController.getArticles);
router.post('/education/articles/:id/read', authMiddleware, EducationController.logArticleRead);
router.get('/education/quizzes', authMiddleware, EducationController.getQuizzes);
router.post('/education/quizzes/:id/submit', authMiddleware, EducationController.submitQuizScore);

// ==========================================
// SIMULATOR ROUTE
// ==========================================
router.post('/simulator', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { dietChange, carKmReduced, publicTransportKmIncreased, electricityReducedPercent } = req.body;

    const footprints = await dbClient.getFootprintsByUserId(userId);
    const latest = footprints.length > 0 ? footprints[footprints.length - 1] : null;

    const currentDiet = latest ? latest.inputs.dietType : 'mixed';
    const currentElectricity = latest ? latest.inputs.electricityKwh : 150; // fallback standard 150 kWh

    const result = SimulatorService.simulate(currentDiet, currentElectricity, {
      dietChange,
      carKmReduced,
      publicTransportKmIncreased,
      electricityReducedPercent
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Simulator Route Error:', err);
    return res.status(500).json({ error: 'Failed to run carbon simulation.' });
  }
});

export default router;
