import request from 'supertest';
import app from '../src/index';
import { dbClient } from '../src/repositories/dbClient';
import { SimulatorService } from '../src/services/simulatorService';
import { PredictionService } from '../src/services/predictionService';
import { CarbonFootprint } from '../src/types';

describe('EcoTrack AI - Backend Test Suite', () => {
  let authToken = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    // Clean database before starting
    await dbClient.clearAllData();
  });

  afterAll(async () => {
    // Cleanup databases
    await dbClient.clearAllData();
  });

  // ==========================================
  // UNIT TESTS
  // ==========================================

  describe('Unit Test: Carbon Simulator Service', () => {
    it('should correctly simulate carbon, financial, and tree savings for diet and electricity changes', () => {
      // Current diet: mixed, current electricity: 200 kWh
      // Simulation: Switch diet to vegan, reduce electricity by 10%
      const result = SimulatorService.simulate('mixed', 200, {
        dietChange: 'vegan',
        electricityReducedPercent: 10,
      });

      // Diet savings: (3.0 mixed - 1.5 vegan) * 30 days = 45 kg CO2 saved
      // Electricity savings: 200 * 10% = 20 kWh saved -> 20 * 0.4 = 8 kg CO2 saved
      // Total monthly co2 saved = 45 + 8 = 53 kg CO2
      expect(result.monthlyCo2SavedKg).toBe(53);
      expect(result.annualCo2SavedKg).toBe(53 * 12); // 636 kg
      
      // Trees equivalent: 636 kg / 22 kg per tree = 28.9 trees
      expect(result.treesEquivalent).toBe(28.9);
      
      // Cost savings:
      // Diet: mixed to vegan daily savings = ₹80 * 30 = ₹2400
      // Electricity: 20 kWh * ₹7 = ₹140
      // Total monthly money saved = 2400 + 140 = ₹2540
      expect(result.monthlyMoneySavedInr).toBe(2540);
    });

    it('should calculate car reduction commute savings correctly', () => {
      // Reducing car by 100km, public transport increased by 100km
      const result = SimulatorService.simulate('vegetarian', 100, {
        carKmReduced: 100,
        publicTransportKmIncreased: 100,
      });

      // Car emissions: 100km * 0.18 = 18kg CO2
      // Public transit emissions: 100km * 0.04 = 4kg CO2
      // Savings = 18 - 4 = 14 kg CO2
      expect(result.monthlyCo2SavedKg).toBe(14);
      
      // Cost:
      // Petrol saved: 100 * 8.33 = ₹833
      // Transit ticket cost: 100 * 2.00 = ₹200
      // Savings = 833 - 200 = ₹633
      expect(result.monthlyMoneySavedInr).toBe(633);
    });
  });

  describe('Unit Test: Prediction Service', () => {
    it('should project flat line if only 1 historical footprint is present', () => {
      const mockFootprints: CarbonFootprint[] = [
        {
          id: 'fp-1',
          userId: 'test-user',
          date: '2026-01',
          inputs: {} as any,
          transportEmissions: 100,
          energyEmissions: 100,
          foodEmissions: 90,
          shoppingEmissions: 30,
          wasteEmissions: 20,
          totalEmissions: 340,
          createdAt: new Date().toISOString()
        }
      ];

      const predictions = PredictionService.predictFutureFootprint(mockFootprints);
      expect(predictions.length).toBe(3);
      expect(predictions[0].date).toBe('2026-02');
      expect(predictions[0].emissions).toBe(340); // flat line projection
    });

    it('should forecast future footprint values using linear regression', () => {
      const mockFootprints: CarbonFootprint[] = [
        {
          id: 'fp-1',
          userId: 'test-user',
          date: '2026-01',
          inputs: {} as any,
          transportEmissions: 100,
          energyEmissions: 100,
          foodEmissions: 90,
          shoppingEmissions: 30,
          wasteEmissions: 20,
          totalEmissions: 350,
          createdAt: new Date().toISOString()
        },
        {
          id: 'fp-2',
          userId: 'test-user',
          date: '2026-02',
          inputs: {} as any,
          transportEmissions: 90,
          energyEmissions: 90,
          foodEmissions: 90,
          shoppingEmissions: 20,
          wasteEmissions: 10,
          totalEmissions: 300, // decreased by 50kg
          createdAt: new Date().toISOString()
        }
      ];

      const predictions = PredictionService.predictFutureFootprint(mockFootprints);
      expect(predictions.length).toBe(3);
      expect(predictions[0].date).toBe('2026-03');
      // Trend: 350 -> 300 (slope -50)
      // Next months predicted: 250, 200, 150
      expect(predictions[0].emissions).toBe(250);
      expect(predictions[1].emissions).toBe(200);
      expect(predictions[2].emissions).toBe(150);
    });
  });

  // ==========================================
  // INTEGRATION / API TESTS
  // ==========================================

  describe('API: Authentication Routes', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@ecotrack.ai',
          password: 'securePassword123',
          fullName: 'Eco Hero'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.fullName).toBe('Eco Hero');
      expect(res.body.user.points).toBe(100); // 100 welcome points
      
      authToken = res.body.token;
    });

    it('should reject registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@ecotrack.ai',
          password: 'anotherPassword',
          fullName: 'Duplicate'
        });

      expect(res.statusCode).toBe(409);
    });

    it('should login successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@ecotrack.ai',
          password: 'securePassword123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should retrieve logged in user profile details', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('test@ecotrack.ai');
    });
  });

  describe('API: Carbon Footprint Calculator', () => {
    it('should submit monthly carbon inputs and calculate correct emissions', async () => {
      const res = await request(app)
        .post('/api/footprint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2026-06',
          carKm: 200,                // 200 * 0.18 = 36 kg
          bikeKm: 50,                // 50 * 0 = 0 kg
          publicTransportKm: 100,    // 100 * 0.04 = 4 kg
          flightHours: 2,            // 2 * 110 = 220 kg
          electricityKwh: 150,       // 150 * 0.4 * (1 - 50%) = 30 kg (50% renewable)
          lpgKg: 10,                 // 10 * 3 = 30 kg
          renewablePercentage: 50,
          dietType: 'vegetarian',    // 2.0 * 30 = 60 kg
          onlinePurchases: 4,        // 4 * 0.5 = 2 kg
          electronicsItems: 1,       // 1 * 80 = 80 kg
          fastFashionItems: 2,       // 2 * 10 = 20 kg
          foodWasteKg: 10,           // 10 * 1.9 = 19 kg
          plasticUsageKg: 5,         // 5 * 2 = 10 kg
          recyclingRate: 50,         // recycling factor 0.5 -> waste = 29 * (1 - 0.25) = 21.75 kg
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.footprint).toHaveProperty('id');
      
      // Sum: Transport (260) + Energy (60) + Food (60) + Shopping (102) + Waste (21.75) = 503.75 kg
      expect(res.body.footprint.totalEmissions).toBeCloseTo(503.75, 1);
      
      // Points check: logged footprint = 50 points
      expect(res.body.gamification.pointsEarned).toBe(50); 
    });

    it('should retrieve footprint logs history', async () => {
      const res = await request(app)
        .get('/api/footprint/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.history.length).toBe(1);
    });
  });

  describe('API: Goals, AI Coach, and Educational Hub', () => {
    it('should create a new carbon reduction goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Reduce transportation emissions by 20%',
          category: 'transportation',
          targetValue: 200,
          targetDate: '2026-09-01'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.goal.category).toBe('transportation');
    });

    it('should retrieve educational articles', async () => {
      const res = await request(app)
        .get('/api/education/articles')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.articles.length).toBeGreaterThan(0);
    });

    it('should submit quiz score and award points', async () => {
      const res = await request(app)
        .post('/api/education/quizzes/quiz-basics/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          score: 5 // perfect score
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.passed).toBe(true);
      expect(res.body.rewards.pointsEarned).toBe(50); // 50 points reward
    });

    it('should return AI Coach conversational reply', async () => {
      const res = await request(app)
        .post('/api/ai/coach')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'How can I reduce my home energy footprint?',
          history: []
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('reply');
    });

    it('should return AI insights and sustainability score breakdown', async () => {
      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('sustainabilityScore');
      expect(res.body.scoreBreakdown).toHaveProperty('learningScore'); // quiz pass checked
    });
  });
});
