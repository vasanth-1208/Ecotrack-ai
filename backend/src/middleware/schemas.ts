import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const footprintSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}$/, 'Date must be in YYYY-MM format'),
    
    // Transport inputs
    carKm: z.number().min(0, 'Kilometers must be a positive number'),
    bikeKm: z.number().min(0, 'Kilometers must be a positive number'),
    publicTransportKm: z.number().min(0, 'Kilometers must be a positive number'),
    flightHours: z.number().min(0, 'Flight hours must be a positive number'),
    
    // Home Energy inputs
    electricityKwh: z.number().min(0, 'Electricity must be a positive number'),
    lpgKg: z.number().min(0, 'LPG must be a positive number'),
    renewablePercentage: z.number().min(0).max(100, 'Renewable percentage must be between 0 and 100'),
    
    // Food inputs
    dietType: z.enum(['vegan', 'vegetarian', 'mixed', 'heavyMeat']),
    
    // Shopping inputs
    onlinePurchases: z.number().int().min(0, 'Purchases must be a positive integer'),
    electronicsItems: z.number().int().min(0, 'Electronics count must be a positive integer'),
    fastFashionItems: z.number().int().min(0, 'Clothing count must be a positive integer'),
    
    // Waste inputs
    foodWasteKg: z.number().min(0, 'Food waste must be a positive number'),
    plasticUsageKg: z.number().min(0, 'Plastic usage must be a positive number'),
    recyclingRate: z.number().min(0).max(100, 'Recycling rate must be between 0 and 100'),
  }),
});

export const goalSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters long'),
    category: z.enum(['transportation', 'homeEnergy', 'food', 'shopping', 'waste', 'overall']),
    targetValue: z.number().min(0, 'Target value must be positive'),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format'),
  }),
});

export const budgetSchema = z.object({
  body: z.object({
    carbonBudget: z.number().min(50, 'Budget must be at least 50 kg CO2'),
  }),
});
