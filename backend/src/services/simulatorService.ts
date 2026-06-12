import { EMISSION_FACTORS } from '../config/emissionFactors';

export interface SimulationInput {
  dietChange?: 'vegetarian' | 'vegan' | 'none';
  carKmReduced?: number; // km per month reduced
  publicTransportKmIncreased?: number; // km per month increased
  electricityReducedPercent?: number; // 0 to 100 percent reduction
}

export interface SimulationResult {
  monthlyCo2SavedKg: number;
  annualCo2SavedKg: number;
  monthlyMoneySavedInr: number;
  annualMoneySavedInr: number;
  treesEquivalent: number;
}

export class SimulatorService {
  public static simulate(
    currentDiet: 'vegan' | 'vegetarian' | 'mixed' | 'heavyMeat',
    currentElectricityKwh: number,
    input: SimulationInput
  ): SimulationResult {
    let monthlyCo2Saved = 0;
    let monthlyMoneySaved = 0;

    // 1. Diet Change Simulation
    if (input.dietChange && input.dietChange !== 'none') {
      const currentDietFactor = EMISSION_FACTORS.food[currentDiet];
      const targetDietFactor = EMISSION_FACTORS.food[input.dietChange];
      
      if (currentDietFactor > targetDietFactor) {
        const dailyCo2Savings = currentDietFactor - targetDietFactor;
        monthlyCo2Saved += dailyCo2Savings * 30; // 30 days in a month

        // Cost savings (meat diets are generally more expensive)
        let dailyMoneySavings = 0;
        if (currentDiet === 'heavyMeat') {
          dailyMoneySavings = input.dietChange === 'vegan' ? 150 : 100;
        } else if (currentDiet === 'mixed') {
          dailyMoneySavings = input.dietChange === 'vegan' ? 80 : 50;
        } else if (currentDiet === 'vegetarian' && input.dietChange === 'vegan') {
          dailyMoneySavings = 30;
        }
        monthlyMoneySaved += dailyMoneySavings * 30;
      }
    }

    // 2. Commute Simulation (Car -> Public Transit / Bike)
    if (input.carKmReduced && input.carKmReduced > 0) {
      const carFactor = EMISSION_FACTORS.transportation.car;
      // We assume reduced car km is replaced by public transit (or bike if publicTransportKmIncreased is lower)
      const transitKm = input.publicTransportKmIncreased || 0;
      const transitFactor = EMISSION_FACTORS.transportation.publicTransport;

      const carCo2 = input.carKmReduced * carFactor;
      const transitCo2 = Math.min(input.carKmReduced, transitKm) * transitFactor;

      monthlyCo2Saved += (carCo2 - transitCo2);

      // Financial savings:
      // Petrol cost: Assuming fuel economy of 12 km/l, petrol cost at ₹100/liter -> ₹8.33 per km
      // Public transport ticket cost: ₹2.00 per km
      const petrolSaved = input.carKmReduced * 8.33;
      const transitTicketCost = Math.min(input.carKmReduced, transitKm) * 2.00;
      monthlyMoneySaved += (petrolSaved - transitTicketCost);
    }

    // 3. Electricity Reduction Simulation
    if (input.electricityReducedPercent && input.electricityReducedPercent > 0) {
      const reductionFraction = input.electricityReducedPercent / 100;
      const kwhSaved = currentElectricityKwh * reductionFraction;
      
      monthlyCo2Saved += kwhSaved * EMISSION_FACTORS.homeEnergy.electricity;
      
      // Cost savings: Assuming ₹7 per kWh for household electricity
      monthlyMoneySaved += kwhSaved * 7.00;
    }

    const annualCo2Saved = monthlyCo2Saved * 12;
    const annualMoneySaved = monthlyMoneySaved * 12;

    // 1 mature tree absorbs ~22 kg CO2 per year
    const treesEquivalent = Math.round((annualCo2Saved / 22) * 10) / 10;

    return {
      monthlyCo2SavedKg: Math.round(monthlyCo2Saved * 100) / 100,
      annualCo2SavedKg: Math.round(annualCo2Saved * 100) / 100,
      monthlyMoneySavedInr: Math.round(monthlyMoneySaved),
      annualMoneySavedInr: Math.round(annualMoneySaved),
      treesEquivalent: Math.max(0, treesEquivalent),
    };
  }
}
