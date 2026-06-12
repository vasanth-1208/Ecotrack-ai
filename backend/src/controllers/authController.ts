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

  public static async demo(req: Request, res: Response) {
    try {
      const demoEmail = `guest-${Math.random().toString(36).substring(2, 7)}@ecotrack.demo`;
      const userId = `demo-${Math.random().toString(36).substring(2, 9)}`;
      const today = new Date().toISOString().split('T')[0];

      // 1. Create User
      const demoUser: User = {
        id: userId,
        email: demoEmail,
        passwordHash: 'demoHashedPassword',
        fullName: 'Guest Eco Warrior',
        points: 420, // Pre-filled points
        level: 2,
        streakDays: 3,
        lastActiveDate: today,
        carbonBudget: 400,
        createdAt: new Date().toISOString()
      };
      await dbClient.createUser(demoUser);

      // 2. Pre-fill 3 Months Carbon History
      const date1 = new Date(); date1.setMonth(date1.getMonth() - 2);
      const m1 = date1.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      
      const date2 = new Date(); date2.setMonth(date2.getMonth() - 1);
      const m2 = date2.toISOString().split('T')[0].substring(0, 7);

      const date3 = new Date();
      const m3 = date3.toISOString().split('T')[0].substring(0, 7);

      // Month 1 Footprint (High: 540 kg CO2)
      await dbClient.createFootprint({
        id: `fp-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        date: m1,
        inputs: {
          date: m1, carKm: 300, bikeKm: 10, publicTransportKm: 20, flightHours: 2,
          electricityKwh: 200, lpgKg: 14, renewablePercentage: 0,
          dietType: 'heavyMeat', onlinePurchases: 6, electronicsItems: 1, fastFashionItems: 3,
          foodWasteKg: 12, plasticUsageKg: 6, recyclingRate: 10
        },
        transportEmissions: 274.0, energyEmissions: 122.0, foodEmissions: 135.0, shoppingEmissions: 113.0, wasteEmissions: 31.0,
        totalEmissions: 675.0,
        createdAt: new Date().toISOString()
      });

      // Month 2 Footprint (Decreasing: 460 kg CO2)
      await dbClient.createFootprint({
        id: `fp-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        date: m2,
        inputs: {
          date: m2, carKm: 200, bikeKm: 30, publicTransportKm: 80, flightHours: 0,
          electricityKwh: 140, lpgKg: 14, renewablePercentage: 20,
          dietType: 'mixed', onlinePurchases: 4, electronicsItems: 0, fastFashionItems: 1,
          foodWasteKg: 8, plasticUsageKg: 4, recyclingRate: 30
        },
        transportEmissions: 39.2, energyEmissions: 86.8, foodEmissions: 90.0, shoppingEmissions: 12.0, wasteEmissions: 19.5,
        totalEmissions: 247.5,
        createdAt: new Date().toISOString()
      });

      // Month 3 Footprint (Low: 216 kg CO2)
      await dbClient.createFootprint({
        id: `fp-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        date: m3,
        inputs: {
          date: m3, carKm: 80, bikeKm: 60, publicTransportKm: 150, flightHours: 0,
          electricityKwh: 80, lpgKg: 10, renewablePercentage: 50,
          dietType: 'vegetarian', onlinePurchases: 2, electronicsItems: 0, fastFashionItems: 0,
          foodWasteKg: 3, plasticUsageKg: 1, recyclingRate: 60
        },
        transportEmissions: 20.4, energyEmissions: 46.0, foodEmissions: 60.0, shoppingEmissions: 1.0, wasteEmissions: 5.4,
        totalEmissions: 132.8,
        createdAt: new Date().toISOString()
      });

      // 3. Pre-fill Goals
      await dbClient.createGoal({
        id: `goal-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        title: 'Reduce transportation emissions to under 50 kg CO2',
        category: 'transportation',
        targetValue: 50.0,
        currentValue: 20.4,
        startDate: m1 + '-01',
        targetDate: m3 + '-30',
        status: 'completed', // completed because current is 20.4 < 50
        createdAt: new Date().toISOString()
      });

      await dbClient.createGoal({
        id: `goal-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        title: 'Adopt 100% renewable energy share at home',
        category: 'homeEnergy',
        targetValue: 0.0,
        currentValue: 46.0,
        startDate: m2 + '-01',
        targetDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // 4. Pre-fill Badges
      await dbClient.createBadge({
        id: `badge-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        badgeType: 'GREEN_STARTER',
        title: 'Green Starter',
        description: 'Welcome to EcoTrack AI! You have taken the first step toward sustainability.',
        earnedAt: new Date().toISOString()
      });

      await dbClient.createBadge({
        id: `badge-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        badgeType: 'CARBON_REDUCER',
        title: 'Carbon Reducer',
        description: 'Successfully reduced monthly emissions by 10%. Keep going!',
        earnedAt: new Date().toISOString()
      });

      // 5. Pre-fill Challenge & Quiz completion
      await dbClient.createUserChallenge({
        id: `uc-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        challengeId: 'ac-24',
        status: 'completed',
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      await dbClient.saveQuizProgress(userId, 'quiz-basics', 4, new Date().toISOString());
      await dbClient.saveReadProgress(userId, 'art-footprint', new Date().toISOString());

      // 6. Sign JWT token
      const token = jwt.sign({ id: userId, email: demoEmail }, JWT_SECRET, { expiresIn: '24h' });

      return res.status(200).json({
        token,
        user: {
          id: userId,
          email: demoEmail,
          fullName: 'Guest Eco Warrior',
          points: 420,
          level: 2,
          streakDays: 3,
          carbonBudget: 400
        }
      });
    } catch (err: any) {
      console.error('Demo Login Error:', err);
      return res.status(500).json({ error: 'Failed to generate demo profile.' });
    }
  }
}
export default AuthController;
