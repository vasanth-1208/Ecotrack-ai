import { CarbonFootprint, Goal, User, UserChallenge } from '../types';

export interface PredictionPoint {
  date: string; // YYYY-MM
  emissions: number;
  confidenceMin: number;
  confidenceMax: number;
}

export interface GoalProbability {
  goalId: string;
  goalTitle: string;
  probabilityPercent: number; // 0 to 100
  projectedEmissionsAtDeadline: number;
  statusText: 'On Track' | 'At Risk' | 'Needs Improvement';
}

export class PredictionService {
  /**
   * Forecasts emissions for the next 3 months using linear regression.
   */
  public static predictFutureFootprint(footprints: CarbonFootprint[]): PredictionPoint[] {
    if (footprints.length === 0) return [];

    const sortedFootprints = [...footprints].sort((a, b) => a.date.localeCompare(b.date));
    const n = sortedFootprints.length;

    // Default values if we have only 1 data point
    if (n < 2) {
      const latest = sortedFootprints[0];
      const baseEmissions = latest.totalEmissions;
      return Array.from({ length: 3 }).map((_, i) => {
        const nextDate = this.getNextMonth(latest.date, i + 1);
        return {
          date: nextDate,
          emissions: Math.round(baseEmissions * 10) / 10,
          confidenceMin: Math.round(baseEmissions * 0.8 * 10) / 10,
          confidenceMax: Math.round(baseEmissions * 1.2 * 10) / 10,
        };
      });
    }

    // Perform linear regression y = mx + c
    // x = index of footprint (0, 1, 2...)
    // y = totalEmissions
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += sortedFootprints[i].totalEmissions;
      sumXY += i * sortedFootprints[i].totalEmissions;
      sumXX += i * i;
    }

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const c = (sumY - m * sumX) / n;

    // Calculate standard error for confidence intervals
    let sumSqErrors = 0;
    for (let i = 0; i < n; i++) {
      const predY = m * i + c;
      sumSqErrors += Math.pow(sortedFootprints[i].totalEmissions - predY, 2);
    }
    const stdError = Math.sqrt(sumSqErrors / (n - 2 || 1)) || 20; // default error buffer

    const latest = sortedFootprints[n - 1];
    const predictions: PredictionPoint[] = [];

    for (let step = 1; step <= 3; step++) {
      const xIdx = (n - 1) + step;
      let predictedY = m * xIdx + c;
      
      // Emissions cannot be negative
      if (predictedY < 0) predictedY = 0;

      // Confidence expands as we forecast further out
      const errorBuffer = stdError * (1 + step * 0.2);

      predictions.push({
        date: this.getNextMonth(latest.date, step),
        emissions: Math.round(predictedY * 10) / 10,
        confidenceMin: Math.round(Math.max(0, predictedY - errorBuffer) * 10) / 10,
        confidenceMax: Math.round((predictedY + errorBuffer) * 10) / 10,
      });
    }

    return predictions;
  }

  /**
   * Forecasts if active goals will be met based on emission trends.
   */
  public static predictGoalProbability(goals: Goal[], footprints: CarbonFootprint[]): GoalProbability[] {
    if (footprints.length === 0) {
      return goals.map(g => ({
        goalId: g.id,
        goalTitle: g.title,
        probabilityPercent: 50,
        projectedEmissionsAtDeadline: g.currentValue,
        statusText: 'Needs Improvement',
      }));
    }

    const sortedFootprints = [...footprints].sort((a, b) => a.date.localeCompare(b.date));
    const n = sortedFootprints.length;
    const latest = sortedFootprints[n - 1];

    // Compute simple slope (kg CO2 per month change)
    let slope = 0;
    if (n >= 2) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += sortedFootprints[i].totalEmissions;
        sumXY += i * sortedFootprints[i].totalEmissions;
        sumXX += i * i;
      }
      slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    } else {
      // With 1 record, we assume no historical trend (flat slope)
      slope = 0;
    }

    return goals.map(goal => {
      // Calculate months between latest footprint and goal deadline
      const monthsLeft = this.getMonthsDifference(latest.date, goal.targetDate.substring(0, 7));
      const projectedEmissions = Math.max(0, latest.totalEmissions + slope * Math.max(1, monthsLeft));

      let probability = 50; // default uncertain

      if (goal.category === 'overall') {
        // Target value is overall emissions goal
        if (projectedEmissions <= goal.targetValue) {
          probability = slope < 0 ? 90 : 75;
        } else {
          // How far off is it?
          const excessRatio = (projectedEmissions - goal.targetValue) / goal.targetValue;
          probability = Math.max(5, Math.round(50 - excessRatio * 100));
        }
      } else {
        // Category specific goal (e.g. reduce transport)
        const categoryKey = this.mapGoalCategoryToInputKey(goal.category);
        const latestCatEmissions = latest[categoryKey] as number;
        // Project category emissions
        const catRatio = latestCatEmissions / (latest.totalEmissions || 1);
        const projectedCatEmissions = projectedEmissions * catRatio;

        if (projectedCatEmissions <= goal.targetValue) {
          probability = slope < 0 ? 85 : 70;
        } else {
          const excessRatio = (projectedCatEmissions - goal.targetValue) / goal.targetValue;
          probability = Math.max(5, Math.round(50 - excessRatio * 100));
        }
      }

      let statusText: 'On Track' | 'At Risk' | 'Needs Improvement' = 'Needs Improvement';
      if (probability >= 70) {
        statusText = 'On Track';
      } else if (probability >= 40) {
        statusText = 'At Risk';
      }

      return {
        goalId: goal.id,
        goalTitle: goal.title,
        probabilityPercent: probability,
        projectedEmissionsAtDeadline: Math.round(projectedEmissions * 10) / 10,
        statusText,
      };
    });
  }

  /**
   * Explainable Sustainability Score (0-100) using weighted formula.
   */
  public static calculateSustainabilityScore(
    _user: User,
    footprints: CarbonFootprint[],
    goals: Goal[],
    userChallenges: UserChallenge[],
    quizCount: number
  ) {
    // 1. Emission Reduction (40%)
    let reductionScore = 50; // baseline if only 1 entry
    if (footprints.length >= 2) {
      const sorted = [...footprints].sort((a, b) => a.date.localeCompare(b.date));
      const initial = sorted[0].totalEmissions;
      const latest = sorted[sorted.length - 1].totalEmissions;

      if (initial > 0) {
        const pctReduction = ((initial - latest) / initial) * 100;
        if (pctReduction > 0) {
          // 25% reduction gives full 100 reduction points
          reductionScore = Math.min(100, Math.round(pctReduction * 4));
        } else {
          // emissions increased
          reductionScore = Math.max(0, Math.round(50 + pctReduction * 2));
        }
      }
    }

    // 2. Renewable Usage (20%)
    let renewableScore = 0;
    if (footprints.length > 0) {
      const sorted = [...footprints].sort((a, b) => a.date.localeCompare(b.date));
      renewableScore = sorted[sorted.length - 1].inputs.renewablePercentage;
    }

    // 3. Challenge Completion (15%)
    let challengeScore = 50; // default if no challenges
    if (userChallenges.length > 0) {
      const completed = userChallenges.filter(uc => uc.status === 'completed').length;
      challengeScore = Math.round((completed / userChallenges.length) * 100);
    }

    // 4. Goal Achievement (15%)
    let goalScore = 50; // default if no goals
    if (goals.length > 0) {
      const completed = goals.filter(g => g.status === 'completed').length;
      goalScore = Math.round((completed / goals.length) * 100);
    }

    // 5. Learning Progress (10%)
    // 5 quizzes completed gives full learning points
    const learningScore = Math.min(100, Math.round((quizCount / 5) * 100));

    const finalScore = (
      (reductionScore * 0.40) +
      (renewableScore * 0.20) +
      (challengeScore * 0.15) +
      (goalScore * 0.15) +
      (learningScore * 0.10)
    );

    return {
      score: Math.round(finalScore),
      breakdown: {
        reductionScore,
        renewableScore,
        challengeScore,
        goalScore,
        learningScore,
      }
    };
  }

  // Helper utility for generating next YYYY-MM
  private static getNextMonth(dateStr: string, offsetMonths: number): string {
    const [year, month] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1 + offsetMonths, 1);
    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${nextYear}-${nextMonth}`;
  }

  // Helper utility to compute difference in months
  private static getMonthsDifference(startMonthStr: string, endMonthStr: string): number {
    const [sYear, sMonth] = startMonthStr.split('-').map(Number);
    const [eYear, eMonth] = endMonthStr.split('-').map(Number);
    return (eYear - sYear) * 12 + (eMonth - sMonth);
  }

  // Maps goal category to the footprint key
  private static mapGoalCategoryToInputKey(cat: string): 'transportEmissions' | 'energyEmissions' | 'foodEmissions' | 'shoppingEmissions' | 'wasteEmissions' {
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
export default PredictionService;
