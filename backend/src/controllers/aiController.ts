import { Response } from 'express';
import { dbClient } from '../repositories/dbClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { AIService } from '../services/aiService';
import { PredictionService } from '../services/predictionService';
import { PDFService } from '../services/pdfService';

export class AIController {
  public static async getInsights(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Compute explainable sustainability score
      const footprints = await dbClient.getFootprintsByUserId(userId);
      const goals = await dbClient.getGoalsByUserId(userId);
      const challenges = await dbClient.getUserChallengesByUserId(userId);
      const quizzes = await dbClient.getQuizProgress(userId);

      const scoreObj = PredictionService.calculateSustainabilityScore(
        user, footprints, goals, challenges, quizzes.length
      );

      // Generate AI Insights (either via Gemini API or local fallback engine)
      const insights = await AIService.generateInsights(user);

      return res.status(200).json({
        sustainabilityScore: scoreObj.score,
        scoreBreakdown: scoreObj.breakdown,
        insights
      });
    } catch (err: any) {
      console.error('Get Insights Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve AI insights.' });
    }
  }

  public static async chatWithCoach(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { message, history } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const reply = await AIService.chatWithCoach(user, message, history || []);
      return res.status(200).json({ reply });
    } catch (err: any) {
      console.error('Chat Coach Error:', err);
      return res.status(500).json({ error: 'AI Coach failed to respond.' });
    }
  }

  public static async downloadReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await dbClient.findUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const footprints = await dbClient.getFootprintsByUserId(userId);
      if (footprints.length === 0) {
        res.status(400).json({ error: 'Please submit at least one carbon footprint log to generate a report.' });
        return;
      }

      const latest = footprints[footprints.length - 1];
      const goals = await dbClient.getGoalsByUserId(userId);
      const challenges = await dbClient.getUserChallengesByUserId(userId);
      const quizzes = await dbClient.getQuizProgress(userId);

      // Perform calculations
      const scoreObj = PredictionService.calculateSustainabilityScore(user, footprints, goals, challenges, quizzes.length);
      const predictions = PredictionService.predictFutureFootprint(footprints);
      const insights = await AIService.generateInsights(user);

      // Stream PDF directly to client response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="EcoTrack_Sustainability_Report_${latest.date}.pdf"`);

      PDFService.generateReport(
        user,
        latest,
        insights,
        predictions,
        scoreObj.score,
        scoreObj.breakdown,
        res
      );
      return;
    } catch (err: any) {
      console.error('Download Report Error:', err);
      // Only send JSON error if headers are not already sent
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF report.' });
        return;
      }
    }
  }
}
export default AIController;
