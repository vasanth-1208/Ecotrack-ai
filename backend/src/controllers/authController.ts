import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { dbClient } from '../repositories/dbClient';
import { User } from '../types';
import { AuthRequest } from '../middleware/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET || 'ecotrack-ai-super-secret-key-123456';

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName } = req.body;

      const existingUser = await dbClient.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);

      const newUser: User = {
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        points: 100, // Welcome points
        level: 1,
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        carbonBudget: 400, // Default monthly budget in kg CO2
        createdAt: new Date().toISOString(),
      };

      const created = await dbClient.createUser(newUser);

      // Award default badge
      const badgeId = 'badge-' + Math.random().toString(36).substring(2, 9);
      await dbClient.createBadge({
        id: badgeId,
        userId: created.id,
        badgeType: 'GREEN_STARTER',
        title: 'Green Starter',
        description: 'Welcome to EcoTrack AI! You have taken the first step toward sustainability.',
        earnedAt: new Date().toISOString(),
      });

      const token = jwt.sign({ id: created.id, email: created.email }, JWT_SECRET, { expiresIn: '24h' });

      return res.status(201).json({
        token,
        user: {
          id: created.id,
          email: created.email,
          fullName: created.fullName,
          points: created.points,
          level: created.level,
          streakDays: created.streakDays,
          carbonBudget: created.carbonBudget,
        },
      });
    } catch (err: any) {
      console.error('Registration Error:', err);
      return res.status(500).json({ error: 'Failed to register user.' });
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await dbClient.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Update streaks
      const today = new Date().toISOString().split('T')[0];
      let newStreak = user.streakDays;
      
      if (user.lastActiveDate) {
        const lastDate = new Date(user.lastActiveDate);
        const todayDate = new Date(today);
        const diffDays = Math.ceil((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Increment streak
          newStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      // Check level upgrades (e.g. 500 points per level)
      const expectedLevel = Math.max(1, Math.floor(user.points / 500) + 1);

      await dbClient.updateUserStats(user.id, user.points, expectedLevel, newStreak, today);

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          points: user.points,
          level: expectedLevel,
          streakDays: newStreak,
          carbonBudget: user.carbonBudget,
        },
      });
    } catch (err: any) {
      console.error('Login Error:', err);
      return res.status(500).json({ error: 'Failed to login.' });
    }
  }

  public static async me(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          points: user.points,
          level: user.level,
          streakDays: user.streakDays,
          carbonBudget: user.carbonBudget,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('Get Profile Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
  }

  public static async updateBudget(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { carbonBudget } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await dbClient.updateUserBudget(userId, carbonBudget);
      return res.status(200).json({ message: 'Carbon budget updated successfully', carbonBudget });
    } catch (err: any) {
      console.error('Update Budget Error:', err);
      return res.status(500).json({ error: 'Failed to update carbon budget.' });
    }
  }
}
export default AuthController;
