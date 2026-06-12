import { Response } from 'express';
import { dbClient } from '../repositories/dbClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { Goal, GoalCategory } from '../types';

export class GoalController {
  public static async createGoal(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, category, targetValue, targetDate } = req.body;

      // Determine current value from latest footprint
      const latestFootprint = await dbClient.getLatestFootprint(userId);
      let currentValue = 400; // default baseline fallback

      if (latestFootprint) {
        if (category === 'overall') {
          currentValue = latestFootprint.totalEmissions;
        } else {
          const key = GoalController.mapCategoryToKey(category);
          currentValue = latestFootprint[key] as number;
        }
      }

      const goalId = 'goal-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

      const newGoal: Goal = {
        id: goalId,
        userId,
        title,
        category: category as GoalCategory,
        targetValue,
        currentValue,
        startDate: new Date().toISOString().split('T')[0],
        targetDate,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const saved = await dbClient.createGoal(newGoal);
      return res.status(201).json({ goal: saved });
    } catch (err: any) {
      console.error('Create Goal Error:', err);
      return res.status(500).json({ error: 'Failed to create goal.' });
    }
  }

  public static async listGoals(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check and update goals status based on latest logs before listing
      const goals = await dbClient.getGoalsByUserId(userId);
      const latest = await dbClient.getLatestFootprint(userId);

      if (latest) {
        for (const goal of goals) {
          if (goal.status === 'active') {
            const key = GoalController.mapCategoryToKey(goal.category);
            const activeVal = goal.category === 'overall' ? latest.totalEmissions : (latest[key] as number);
            
            // Check deadline
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = today > goal.targetDate;

            if (activeVal <= goal.targetValue) {
              // Goal achieved!
              await dbClient.updateGoalProgress(goal.id, activeVal, 'completed');
              goal.currentValue = activeVal;
              goal.status = 'completed';

              // Reward user points
              const user = await dbClient.findUserById(userId);
              if (user) {
                const newPoints = user.points + 150; // Goal success reward
                const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);
                await dbClient.updateUserStats(userId, newPoints, newLevel, user.streakDays, user.lastActiveDate);
              }
            } else if (isOverdue) {
              // Goal failed
              await dbClient.updateGoalProgress(goal.id, activeVal, 'failed');
              goal.currentValue = activeVal;
              goal.status = 'failed';
            } else {
              // Just update progress
              await dbClient.updateGoalProgress(goal.id, activeVal, 'active');
              goal.currentValue = activeVal;
            }
          }
        }
      }

      return res.status(200).json({ goals });
    } catch (err: any) {
      console.error('List Goals Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve goals.' });
    }
  }

  public static async updateGoal(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { currentValue } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const goal = await dbClient.getGoalById(id);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ error: 'Goal not found' });
      }

      let status = goal.status;
      if (currentValue <= goal.targetValue) {
        status = 'completed';
        // Reward
        const user = await dbClient.findUserById(userId);
        if (user) {
          const newPoints = user.points + 150;
          const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);
          await dbClient.updateUserStats(userId, newPoints, newLevel, user.streakDays, user.lastActiveDate);
        }
      }

      await dbClient.updateGoalProgress(id, currentValue, status);
      return res.status(200).json({ message: 'Goal progress updated', status, currentValue });
    } catch (err: any) {
      console.error('Update Goal Error:', err);
      return res.status(500).json({ error: 'Failed to update goal.' });
    }
  }

  private static mapCategoryToKey(cat: GoalCategory): 'transportEmissions' | 'energyEmissions' | 'foodEmissions' | 'shoppingEmissions' | 'wasteEmissions' {
    switch (cat) {
      case 'transportation': return 'transportEmissions';
      case 'homeEnergy': return 'energyEmissions';
      case 'food': return 'foodEmissions';
      case 'shopping': return 'shoppingEmissions';
      case 'waste': return 'wasteEmissions';
      default: return 'transportEmissions';
    }
  }
}
export default GoalController;
