import { Response } from 'express';
import { dbClient } from '../repositories/dbClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { Challenge, UserChallenge, LeaderboardEntry } from '../types';
import { PredictionService } from '../services/predictionService';

// Dynamic challenge templates
const CHALLENGE_TEMPLATES: Record<string, Omit<Challenge, 'id'>> = {
  // Transport
  'transit-3': {
    title: 'Public Transport Commuter',
    description: 'Use public transport for your daily commute at least 3 times this week.',
    category: 'transportation',
    points: 100,
    durationDays: 7,
    sdgAlignments: ['SDG 11', 'SDG 13']
  },
  'cycle-5': {
    title: 'Pedal Power',
    description: 'Walk or cycle for all short trips (under 3km) for 5 days.',
    category: 'transportation',
    points: 80,
    durationDays: 5,
    sdgAlignments: ['SDG 11', 'SDG 13']
  },
  // Home Energy
  'ac-24': {
    title: 'AC Eco Settings',
    description: 'Set your air conditioner thermostat to 24°C or higher whenever active for 7 days.',
    category: 'homeEnergy',
    points: 75,
    durationDays: 7,
    sdgAlignments: ['SDG 7', 'SDG 13']
  },
  'unplug-3': {
    title: 'Standby Power Cut',
    description: 'Unplug all chargers, microwave, and standby electronics at night for 3 consecutive days.',
    category: 'homeEnergy',
    points: 50,
    durationDays: 3,
    sdgAlignments: ['SDG 7', 'SDG 13']
  },
  // Food
  'meatless-5': {
    title: 'Green Diet Transition',
    description: 'Avoid meat and adopt a vegetarian or vegan diet for 5 days.',
    category: 'food',
    points: 120,
    durationDays: 5,
    sdgAlignments: ['SDG 12', 'SDG 13']
  },
  'local-fresh': {
    title: 'Locavore Weekend',
    description: 'Consume only locally produced, seasonal food items for a full weekend.',
    category: 'food',
    points: 70,
    durationDays: 2,
    sdgAlignments: ['SDG 12']
  },
  // Shopping
  'no-shop-7': {
    title: 'Consumption Cleanse',
    description: 'Avoid making online non-essential shopping orders for 7 days.',
    category: 'shopping',
    points: 90,
    durationDays: 7,
    sdgAlignments: ['SDG 12']
  },
  'secondhand-hero': {
    title: 'Pre-owned Purchase',
    description: 'Source a pre-owned clothing item or electronic device instead of buying brand new.',
    category: 'shopping',
    points: 80,
    durationDays: 7,
    sdgAlignments: ['SDG 12']
  },
  // Waste
  'zero-food-waste': {
    title: 'Clean Plate Club',
    description: 'Generate zero food waste during preparation and dining for 3 consecutive days.',
    category: 'waste',
    points: 100,
    durationDays: 3,
    sdgAlignments: ['SDG 12', 'SDG 13']
  },
  'plastic-free': {
    title: 'Hydration Station',
    description: 'Refuse all single-use plastic cups/bottles and use a reusable thermos for 7 days.',
    category: 'waste',
    points: 80,
    durationDays: 7,
    sdgAlignments: ['SDG 12']
  }
};

export class GamificationController {
  public static async getChallenges(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check user's latest footprint to generate challenges dynamically
      const latest = await dbClient.getLatestFootprint(userId);
      const userChallenges = await dbClient.getUserChallengesByUserId(userId);

      let categoriesToFocus: string[] = ['transportation', 'homeEnergy', 'food']; // default focus
      
      if (latest) {
        const sortedCategories = [
          { name: 'transportation', val: latest.transportEmissions },
          { name: 'homeEnergy', val: latest.energyEmissions },
          { name: 'food', val: latest.foodEmissions },
          { name: 'shopping', val: latest.shoppingEmissions },
          { name: 'waste', val: latest.wasteEmissions }
        ].sort((a, b) => b.val - a.val);

        categoriesToFocus = sortedCategories.slice(0, 3).map(c => c.name);
      }

      // Select templates matching the focus categories
      const activeChallenges: (Challenge & { progress: number; status: 'joined' | 'completed' | 'not_joined' })[] = [];

      Object.entries(CHALLENGE_TEMPLATES).forEach(([tplId, tpl]) => {
        if (categoriesToFocus.includes(tpl.category)) {
          const userChallenge = userChallenges.find(uc => uc.challengeId === tplId);
          
          activeChallenges.push({
            id: tplId,
            ...tpl,
            progress: userChallenge ? userChallenge.progress : 0,
            status: userChallenge 
              ? (userChallenge.status === 'completed' ? 'completed' : 'joined')
              : 'not_joined'
          });
        }
      });

      return res.status(200).json({ challenges: activeChallenges });
    } catch (err: any) {
      console.error('Get Challenges Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve challenges.' });
    }
  }

  public static async joinChallenge(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params; // template challenge ID

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const existing = await dbClient.getUserChallenge(userId, id);
      if (existing) {
        return res.status(409).json({ error: 'Challenge already joined' });
      }

      const template = CHALLENGE_TEMPLATES[id];
      if (!template) {
        return res.status(404).json({ error: 'Challenge template not found' });
      }

      const ucId = 'uc-' + Math.random().toString(36).substring(2, 9);
      const newUc: UserChallenge = {
        id: ucId,
        userId,
        challengeId: id,
        status: 'in_progress',
        progress: 0,
        startedAt: new Date().toISOString(),
        completedAt: null
      };

      await dbClient.createUserChallenge(newUc);
      return res.status(201).json({ message: 'Joined challenge successfully', challenge: newUc });
    } catch (err: any) {
      console.error('Join Challenge Error:', err);
      return res.status(500).json({ error: 'Failed to join challenge.' });
    }
  }

  public static async logChallengeProgress(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params; // challengeId
      const { progress } = req.body; // percentage (0 - 100)

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const uc = await dbClient.getUserChallenge(userId, id);
      if (!uc) {
        return res.status(404).json({ error: 'User challenge entry not found' });
      }

      if (uc.status === 'completed') {
        return res.status(400).json({ error: 'Challenge already completed' });
      }

      const template = CHALLENGE_TEMPLATES[id];
      const isCompleted = progress >= 100;
      const status = isCompleted ? 'completed' : 'in_progress';
      const completedAt = isCompleted ? new Date().toISOString() : null;

      await dbClient.updateUserChallengeProgress(userId, id, Math.min(100, progress), status, completedAt);

      let pointsEarned = 0;
      let newLevel = 1;
      let totalPoints = 0;

      if (isCompleted) {
        pointsEarned = template.points;
        const user = await dbClient.findUserById(userId);
        if (user) {
          totalPoints = user.points + pointsEarned;
          newLevel = Math.max(1, Math.floor(totalPoints / 500) + 1);
          await dbClient.updateUserStats(userId, totalPoints, newLevel, user.streakDays, user.lastActiveDate);
        }
      }

      return res.status(200).json({
        message: isCompleted ? 'Challenge completed! Points rewarded.' : 'Challenge progress updated.',
        progress,
        status,
        rewards: isCompleted ? { pointsEarned, totalPoints, newLevel } : null
      });
    } catch (err: any) {
      console.error('Log Challenge Progress Error:', err);
      return res.status(500).json({ error: 'Failed to log challenge progress.' });
    }
  }

  public static async getLeaderboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const users = await dbClient.getAllUsersSortedByPoints();
      
      const leaderboard: LeaderboardEntry[] = [];

      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        
        // Fetch footprint, goals, challenges, quizzes to compute sustainability score
        const footprints = await dbClient.getFootprintsByUserId(u.id);
        const goals = await dbClient.getGoalsByUserId(u.id);
        const challenges = await dbClient.getUserChallengesByUserId(u.id);
        const quizzes = await dbClient.getQuizProgress(u.id);

        const scoreObj = PredictionService.calculateSustainabilityScore(
          u, footprints, goals, challenges, quizzes.length
        );

        leaderboard.push({
          userId: u.id,
          fullName: u.fullName,
          points: u.points,
          level: u.level,
          sustainabilityScore: scoreObj.score,
          rank: i + 1
        });
      }

      // Re-sort by sustainability score as a differentiator, or keep points ranking and show score
      // Prompt says: "Compare progress anonymously... Leaderboard". Points are standard, displaying score too.
      return res.status(200).json({ leaderboard });
    } catch (err: any) {
      console.error('Get Leaderboard Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve leaderboard.' });
    }
  }

  public static async getBadges(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const badges = await dbClient.getBadgesByUserId(userId);
      return res.status(200).json({ badges });
    } catch (err: any) {
      console.error('Get Badges Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve badges.' });
    }
  }
}
export default GamificationController;
