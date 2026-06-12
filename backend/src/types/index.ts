export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  points: number;
  level: number;
  streakDays: number;
  lastActiveDate: string | null;
  carbonBudget: number; // monthly budget in kg CO2
  createdAt: string;
}

export interface FootprintInput {
  date: string; // YYYY-MM
  // Transport
  carKm: number;
  bikeKm: number;
  publicTransportKm: number;
  flightHours: number;
  // Home Energy
  electricityKwh: number;
  lpgKg: number;
  renewablePercentage: number; // 0 to 100
  // Food
  dietType: 'vegan' | 'vegetarian' | 'mixed' | 'heavyMeat';
  // Shopping
  onlinePurchases: number;
  electronicsItems: number;
  fastFashionItems: number;
  // Waste
  foodWasteKg: number;
  plasticUsageKg: number;
  recyclingRate: number; // 0 to 100
}

export interface CarbonFootprint {
  id: string;
  userId: string;
  date: string; // YYYY-MM
  inputs: FootprintInput;
  transportEmissions: number;
  energyEmissions: number;
  foodEmissions: number;
  shoppingEmissions: number;
  wasteEmissions: number;
  totalEmissions: number;
  createdAt: string;
}

export type GoalCategory = 'transportation' | 'homeEnergy' | 'food' | 'shopping' | 'waste' | 'overall';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: GoalCategory;
  targetValue: number; // target emissions in kg CO2
  currentValue: number; // current emissions in kg CO2
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
}

export type BadgeType = 'GREEN_STARTER' | 'ECO_WARRIOR' | 'CARBON_REDUCER' | 'CLIMATE_CHAMPION';

export interface Badge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  title: string;
  description: string;
  earnedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: 'transportation' | 'homeEnergy' | 'food' | 'shopping' | 'waste';
  points: number;
  durationDays: number;
  sdgAlignments: string[];
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  status: 'in_progress' | 'completed';
  progress: number; // 0 to 100
  startedAt: string;
  completedAt: string | null;
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  points: number;
  level: number;
  sustainabilityScore: number;
  rank: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  pointsReward: number;
  sdgAlignments: string[];
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  readTimeMinutes: number;
  sdgAlignments: string[];
}

export interface AIActionPlanItem {
  habit: string;
  impact: string; // e.g., "Saves 40 kg CO2 / year"
  difficulty: 'easy' | 'medium' | 'hard';
  sdgAlignments: string[];
}

export interface AIInsights {
  roadmap: {
    immediateTargets: string[];
    longTermGoals: string[];
    recommendedOffsetsKg: number;
  };
  weeklyActionPlan: AIActionPlanItem[];
  spikeExplanation: string | null;
  peerComparison: string;
  reportSummary: string;
}
