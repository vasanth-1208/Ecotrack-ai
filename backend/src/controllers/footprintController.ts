import { Response } from 'express';
import { dbClient } from '../repositories/dbClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { CarbonFootprint, FootprintInput } from '../types';
import { EMISSION_FACTORS } from '../config/emissionFactors';

export class FootprintController {
  public static async submitFootprint(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const inputs = req.body as FootprintInput;

      // 1. Calculate emissions (in kg CO2)
      
      // Transport
      const transportEmissions = 
        (inputs.carKm * EMISSION_FACTORS.transportation.car) +
        (inputs.bikeKm * EMISSION_FACTORS.transportation.bike) +
        (inputs.publicTransportKm * EMISSION_FACTORS.transportation.publicTransport) +
        (inputs.flightHours * EMISSION_FACTORS.transportation.flight);

      // Home Energy
      const energyEmissions = 
        (inputs.electricityKwh * EMISSION_FACTORS.homeEnergy.electricity * (1 - inputs.renewablePercentage / 100)) +
        (inputs.lpgKg * EMISSION_FACTORS.homeEnergy.lpg);

      // Food (Daily food emissions * 30 days)
      const foodEmissions = EMISSION_FACTORS.food[inputs.dietType] * 30;

      // Shopping
      const shoppingEmissions = 
        (inputs.onlinePurchases * EMISSION_FACTORS.shopping.onlinePurchase) +
        (inputs.electronicsItems * EMISSION_FACTORS.shopping.electronics) +
        (inputs.fastFashionItems * EMISSION_FACTORS.shopping.fastFashion);

      // Waste (Waste emissions reduced by recycling rate multiplier)
      const rawWaste = 
        (inputs.foodWasteKg * EMISSION_FACTORS.waste.foodWaste) +
        (inputs.plasticUsageKg * EMISSION_FACTORS.waste.plasticUsage);
      const recyclingReduction = inputs.recyclingRate * EMISSION_FACTORS.waste.recyclingReductionFactor / 100; // max 50%
      const wasteEmissions = rawWaste * (1 - recyclingReduction);

      const totalEmissions = transportEmissions + energyEmissions + foodEmissions + shoppingEmissions + wasteEmissions;

      const footprintId = 'footprint-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

      const newFootprint: CarbonFootprint = {
        id: footprintId,
        userId,
        date: inputs.date,
        inputs,
        transportEmissions: Math.round(transportEmissions * 100) / 100,
        energyEmissions: Math.round(energyEmissions * 100) / 100,
        foodEmissions: Math.round(foodEmissions * 100) / 100,
        shoppingEmissions: Math.round(shoppingEmissions * 100) / 100,
        wasteEmissions: Math.round(wasteEmissions * 100) / 100,
        totalEmissions: Math.round(totalEmissions * 100) / 100,
        createdAt: new Date().toISOString(),
      };

      // Get previous footprint before saving the new one
      const history = await dbClient.getFootprintsByUserId(userId);
      const previous = history.length > 0 ? history[history.length - 1] : null;

      // Save to database
      const saved = await dbClient.createFootprint(newFootprint);

      // 2. Award gamification points
      const user = await dbClient.findUserById(userId);
      if (user) {
        let earnedPoints = 50; // Base completion reward
        let actionsPerformed: string[] = ['Logged monthly footprint'];

        // Bonus 1: Stay under budget
        if (totalEmissions <= user.carbonBudget) {
          earnedPoints += 50;
          actionsPerformed.push('Stayed under carbon budget (+50 pts)');
        }

        // Bonus 2: Carbon reduction compared to previous log
        if (previous && totalEmissions < previous.totalEmissions) {
          const savings = previous.totalEmissions - totalEmissions;
          const percentageSaved = Math.round((savings / previous.totalEmissions) * 100);
          
          if (percentageSaved >= 10) {
            earnedPoints += 100;
            actionsPerformed.push(`Reduced emissions by ${percentageSaved}% compared to last month (+100 pts)`);
            
            // Award Carbon Reducer Badge
            await dbClient.createBadge({
              id: 'badge-' + Math.random().toString(36).substring(2, 9),
              userId: user.id,
              badgeType: 'CARBON_REDUCER',
              title: 'Carbon Reducer',
              description: `Successfully reduced monthly emissions by ${percentageSaved}%. Keep going!`,
              earnedAt: new Date().toISOString()
            });
          }
        }

        // Bonus 3: Eco Warrior Check
        if (totalEmissions <= 200) {
          await dbClient.createBadge({
            id: 'badge-' + Math.random().toString(36).substring(2, 9),
            userId: user.id,
            badgeType: 'ECO_WARRIOR',
            title: 'Eco Warrior',
            description: 'Achieved a monthly footprint under 200 kg CO2. Outstanding green citizen!',
            earnedAt: new Date().toISOString()
          });
        }

        const newPoints = user.points + earnedPoints;
        const newLevel = Math.max(1, Math.floor(newPoints / 500) + 1);

        if (newLevel >= 5) {
          await dbClient.createBadge({
            id: 'badge-' + Math.random().toString(36).substring(2, 9),
            userId: user.id,
            badgeType: 'CLIMATE_CHAMPION',
            title: 'Climate Champion',
            description: 'Reached Level 5 on EcoTrack AI! A true leader in environmental advocacy.',
            earnedAt: new Date().toISOString()
          });
        }

        await dbClient.updateUserStats(user.id, newPoints, newLevel, user.streakDays, user.lastActiveDate);

        return res.status(201).json({
          footprint: saved,
          gamification: {
            pointsEarned: earnedPoints,
            totalPoints: newPoints,
            level: newLevel,
            messages: actionsPerformed
          }
        });
      }

      return res.status(201).json({ footprint: saved });
    } catch (err: any) {
      console.error('Submit Footprint Error:', err);
      return res.status(500).json({ error: 'Failed to submit carbon footprint.' });
    }
  }

  public static async getHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const history = await dbClient.getFootprintsByUserId(userId);
      return res.status(200).json({ history });
    } catch (err: any) {
      console.error('Get History Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve carbon history.' });
    }
  }
}
export default FootprintController;
