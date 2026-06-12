import { Response } from 'express';
import { dbClient } from '../repositories/dbClient';
import { AuthRequest } from '../middleware/authMiddleware';

export interface OffsetProject {
  id: string;
  title: string;
  description: string;
  category: 'forestry' | 'solar' | 'wind';
  costPerUnitInr: number;
  offsetPerUnitKg: number; // kg CO2 offset per unit purchase
  unitName: string;
  sdgAlignments: string[];
  imageUrl: string;
}

const OFFSET_PROJECTS: OffsetProject[] = [
  {
    id: 'offset-tree',
    title: 'Western Ghats Agroforestry & Reforestation',
    description: 'Support smallholder farmers in India planting native fruit and timber trees. Restores soil health, creates local income, and sequesters carbon.',
    category: 'forestry',
    costPerUnitInr: 250,
    offsetPerUnitKg: 22, // 1 tree sequesters ~22 kg CO2 / year
    unitName: 'Tree Planted',
    sdgAlignments: ['SDG 13', 'SDG 15'],
    imageUrl: '/images/offsets/tree.jpg'
  },
  {
    id: 'offset-stove',
    title: 'Clean Biomass Cookstoves for Rural Households',
    description: 'Distribute thermal-efficient biomass cookstoves to replace open-fire wood stoves in rural households. Dramatically improves indoor air quality and reduces local deforestation.',
    category: 'solar',
    costPerUnitInr: 1200,
    offsetPerUnitKg: 250, // saves ~250 kg CO2 / year
    unitName: 'Cookstove Deployed',
    sdgAlignments: ['SDG 7', 'SDG 12', 'SDG 13'],
    imageUrl: '/images/offsets/stove.jpg'
  },
  {
    id: 'offset-wind',
    title: 'Community Renewable Wind Power Grid',
    description: 'Finance wind turbine installations feeding electricity into local regional grids in Southern India, replacing coal-fired thermal generation.',
    category: 'wind',
    costPerUnitInr: 2000,
    offsetPerUnitKg: 500, // offsets ~500 kg CO2
    unitName: 'MWh Certificate',
    sdgAlignments: ['SDG 7', 'SDG 13'],
    imageUrl: '/images/offsets/wind.jpg'
  }
];

export class OffsetController {
  public static async getRecommendations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const latest = await dbClient.getLatestFootprint(userId);
      const totalEmissions = latest ? latest.totalEmissions : 350; // fallback default to 350kg if no footprint logged

      const recommendations = OFFSET_PROJECTS.map(project => {
        // Calculate units needed to offset user's footprint completely
        const unitsNeeded = Math.ceil(totalEmissions / project.offsetPerUnitKg);
        const totalCost = unitsNeeded * project.costPerUnitInr;

        return {
          ...project,
          unitsNeeded,
          totalCostInr: totalCost,
          impactMessage: `Purchasing ${unitsNeeded} ${project.unitName}(s) offsets ${Math.round(unitsNeeded * project.offsetPerUnitKg)} kg CO2, completely neutralizing your monthly footprint of ${Math.round(totalEmissions)} kg CO2.`
        };
      });

      return res.status(200).json({
        totalMonthlyEmissions: totalEmissions,
        recommendations
      });
    } catch (err: any) {
      console.error('Get Offsets Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve offset recommendations.' });
    }
  }
}
export default OffsetController;
