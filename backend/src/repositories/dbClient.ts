import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { 
  User, CarbonFootprint, Goal, Badge, UserChallenge, BadgeType, GoalCategory
} from '../types';

const DATA_DIR = path.join(__dirname, '../../data');
const JSON_DB_PATH = path.join(DATA_DIR, 'db.json');

// Initialize local JSON database structure
interface JsonDbSchema {
  users: User[];
  footprints: CarbonFootprint[];
  goals: Goal[];
  badges: Badge[];
  userChallenges: UserChallenge[];
  quizProgress: { userId: string; quizId: string; score: number; completedAt: string }[];
  readProgress: { userId: string; articleId: string; completedAt: string }[];
}

const defaultDbState: JsonDbSchema = {
  users: [],
  footprints: [],
  goals: [],
  badges: [],
  userChallenges: [],
  quizProgress: [],
  readProgress: []
};

class DatabaseClient {
  private pool: Pool | null = null;
  private usePostgres = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      console.log('⚡ DATABASE_URL found. Initializing PostgreSQL Connection Pool...');
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
      });
      this.usePostgres = true;
    } else {
      console.log('⚠️ DATABASE_URL not found. Initializing local JSON Database Fallback...');
      this.initJsonDb();
    }
  }

  // Getter for checking database mode
  public isPostgres(): boolean {
    return this.usePostgres;
  }

  // Initialize JSON database folder and file
  private initJsonDb() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(JSON_DB_PATH)) {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(defaultDbState, null, 2), 'utf-8');
    }
  }

  // Read entire state of the JSON database
  private readJsonDb(): JsonDbSchema {
    this.initJsonDb();
    try {
      const content = fs.readFileSync(JSON_DB_PATH, 'utf-8');
      return JSON.parse(content) as JsonDbSchema;
    } catch (err) {
      console.error('Failed to read JSON DB. Resetting to default state...', err);
      return defaultDbState;
    }
  }

  // Save state of the JSON database
  private writeJsonDb(data: JsonDbSchema) {
    this.initJsonDb();
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  // Initialize DB tables for PostgreSQL
  public async initDbSchema() {
    if (!this.usePostgres || !this.pool) return;

    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        streak_days INTEGER DEFAULT 0,
        last_active_date VARCHAR(10),
        carbon_budget INTEGER DEFAULT 400,
        created_at VARCHAR(30) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS footprints (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        date VARCHAR(7) NOT NULL,
        inputs JSONB NOT NULL,
        transport_emissions DECIMAL NOT NULL,
        energy_emissions DECIMAL NOT NULL,
        food_emissions DECIMAL NOT NULL,
        shopping_emissions DECIMAL NOT NULL,
        waste_emissions DECIMAL NOT NULL,
        total_emissions DECIMAL NOT NULL,
        created_at VARCHAR(30) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS goals (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        target_value DECIMAL NOT NULL,
        current_value DECIMAL NOT NULL,
        start_date VARCHAR(10) NOT NULL,
        target_date VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at VARCHAR(30) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS badges (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        badge_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        earned_at VARCHAR(30) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_challenges (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        challenge_id VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        progress INTEGER DEFAULT 0,
        started_at VARCHAR(30) NOT NULL,
        completed_at VARCHAR(30)
      );

      CREATE TABLE IF NOT EXISTS quiz_progress (
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        quiz_id VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        completed_at VARCHAR(30) NOT NULL,
        PRIMARY KEY (user_id, quiz_id)
      );

      CREATE TABLE IF NOT EXISTS read_progress (
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        article_id VARCHAR(50) NOT NULL,
        completed_at VARCHAR(30) NOT NULL,
        PRIMARY KEY (user_id, article_id)
      );
    `;

    try {
      await this.pool.query(query);
      console.log('⚡ PostgreSQL Database schema verified/created successfully.');
    } catch (err) {
      console.error('❌ Error executing database initialization schema:', err);
      console.log('Falling back to local JSON database for reliability...');
      this.usePostgres = false;
      this.pool = null;
      this.initJsonDb();
    }
  }

  // ==========================================
  // USER REPOSITORY METHODS
  // ==========================================

  public async createUser(user: User): Promise<User> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO users (id, email, password_hash, full_name, points, level, streak_days, last_active_date, carbon_budget, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
      const res = await this.pool.query(q, [
        user.id, user.email, user.passwordHash, user.fullName, user.points, user.level, user.streakDays, user.lastActiveDate, user.carbonBudget, user.createdAt
      ]);
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        fullName: row.full_name,
        points: row.points,
        level: row.level,
        streakDays: row.streak_days,
        lastActiveDate: row.last_active_date,
        carbonBudget: row.carbon_budget,
        createdAt: row.created_at
      };
    } else {
      const db = this.readJsonDb();
      db.users.push(user);
      this.writeJsonDb(db);
      return user;
    }
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        fullName: row.full_name,
        points: row.points,
        level: row.level,
        streakDays: row.streak_days,
        lastActiveDate: row.last_active_date,
        carbonBudget: row.carbon_budget,
        createdAt: row.created_at
      };
    } else {
      const db = this.readJsonDb();
      return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  }

  public async findUserById(id: string): Promise<User | null> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        fullName: row.full_name,
        points: row.points,
        level: row.level,
        streakDays: row.streak_days,
        lastActiveDate: row.last_active_date,
        carbonBudget: row.carbon_budget,
        createdAt: row.created_at
      };
    } else {
      const db = this.readJsonDb();
      return db.users.find(u => u.id === id) || null;
    }
  }

  public async updateUserStats(id: string, points: number, level: number, streakDays: number, lastActiveDate: string | null): Promise<void> {
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        'UPDATE users SET points = $1, level = $2, streak_days = $3, last_active_date = $4 WHERE id = $5',
        [points, level, streakDays, lastActiveDate, id]
      );
    } else {
      const db = this.readJsonDb();
      const user = db.users.find(u => u.id === id);
      if (user) {
        user.points = points;
        user.level = level;
        user.streakDays = streakDays;
        user.lastActiveDate = lastActiveDate;
        this.writeJsonDb(db);
      }
    }
  }

  public async updateUserBudget(id: string, budget: number): Promise<void> {
    if (this.usePostgres && this.pool) {
      await this.pool.query('UPDATE users SET carbon_budget = $1 WHERE id = $2', [budget, id]);
    } else {
      const db = this.readJsonDb();
      const user = db.users.find(u => u.id === id);
      if (user) {
        user.carbonBudget = budget;
        this.writeJsonDb(db);
      }
    }
  }

  public async getAllUsersSortedByPoints(): Promise<User[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM users ORDER BY points DESC');
      return res.rows.map(row => ({
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        fullName: row.full_name,
        points: row.points,
        level: row.level,
        streakDays: row.streak_days,
        lastActiveDate: row.last_active_date,
        carbonBudget: row.carbon_budget,
        createdAt: row.created_at
      }));
    } else {
      const db = this.readJsonDb();
      return [...db.users].sort((a, b) => b.points - a.points);
    }
  }

  // ==========================================
  // CARBON FOOTPRINT METHODS
  // ==========================================

  public async createFootprint(footprint: CarbonFootprint): Promise<CarbonFootprint> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO footprints (id, user_id, date, inputs, transport_emissions, energy_emissions, food_emissions, shopping_emissions, waste_emissions, total_emissions, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
      await this.pool.query(q, [
        footprint.id,
        footprint.userId,
        footprint.date,
        JSON.stringify(footprint.inputs),
        footprint.transportEmissions,
        footprint.energyEmissions,
        footprint.foodEmissions,
        footprint.shoppingEmissions,
        footprint.wasteEmissions,
        footprint.totalEmissions,
        footprint.createdAt
      ]);
      return footprint;
    } else {
      const db = this.readJsonDb();
      // Remove any existing entry for the same user and month (upsert feel)
      db.footprints = db.footprints.filter(f => !(f.userId === footprint.userId && f.date === footprint.date));
      db.footprints.push(footprint);
      this.writeJsonDb(db);
      return footprint;
    }
  }

  public async getFootprintsByUserId(userId: string): Promise<CarbonFootprint[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM footprints WHERE user_id = $1 ORDER BY date ASC', [userId]);
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        inputs: typeof row.inputs === 'string' ? JSON.parse(row.inputs) : row.inputs,
        transportEmissions: Number(row.transport_emissions),
        energyEmissions: Number(row.energy_emissions),
        foodEmissions: Number(row.food_emissions),
        shoppingEmissions: Number(row.shopping_emissions),
        wasteEmissions: Number(row.waste_emissions),
        totalEmissions: Number(row.total_emissions),
        createdAt: row.created_at
      }));
    } else {
      const db = this.readJsonDb();
      return db.footprints.filter(f => f.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  public async getLatestFootprint(userId: string): Promise<CarbonFootprint | null> {
    const list = await this.getFootprintsByUserId(userId);
    if (list.length === 0) return null;
    return list[list.length - 1]; // sorted by date ASC, so last is latest
  }

  // ==========================================
  // GOALS METHODS
  // ==========================================

  public async createGoal(goal: Goal): Promise<Goal> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO goals (id, user_id, title, category, target_value, current_value, start_date, target_date, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
      await this.pool.query(q, [
        goal.id, goal.userId, goal.title, goal.category, goal.targetValue, goal.currentValue, goal.startDate, goal.targetDate, goal.status, goal.createdAt
      ]);
      return goal;
    } else {
      const db = this.readJsonDb();
      db.goals.push(goal);
      this.writeJsonDb(db);
      return goal;
    }
  }

  public async getGoalsByUserId(userId: string): Promise<Goal[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        category: row.category as GoalCategory,
        targetValue: Number(row.target_value),
        currentValue: Number(row.current_value),
        startDate: row.start_date,
        targetDate: row.target_date,
        status: row.status as 'active' | 'completed' | 'failed',
        createdAt: row.created_at
      }));
    } else {
      const db = this.readJsonDb();
      return db.goals.filter(g => g.userId === userId);
    }
  }

  public async updateGoalProgress(goalId: string, currentValue: number, status: 'active' | 'completed' | 'failed'): Promise<void> {
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        'UPDATE goals SET current_value = $1, status = $2 WHERE id = $3',
        [currentValue, status, goalId]
      );
    } else {
      const db = this.readJsonDb();
      const goal = db.goals.find(g => g.id === goalId);
      if (goal) {
        goal.currentValue = currentValue;
        goal.status = status;
        this.writeJsonDb(db);
      }
    }
  }

  public async getGoalById(goalId: string): Promise<Goal | null> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM goals WHERE id = $1', [goalId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        category: row.category as GoalCategory,
        targetValue: Number(row.target_value),
        currentValue: Number(row.current_value),
        startDate: row.start_date,
        targetDate: row.target_date,
        status: row.status as 'active' | 'completed' | 'failed',
        createdAt: row.created_at
      };
    } else {
      const db = this.readJsonDb();
      return db.goals.find(g => g.id === goalId) || null;
    }
  }

  // ==========================================
  // BADGES METHODS
  // ==========================================

  public async createBadge(badge: Badge): Promise<Badge> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO badges (id, user_id, badge_type, title, description, earned_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`;
      await this.pool.query(q, [
        badge.id, badge.userId, badge.badgeType, badge.title, badge.description, badge.earnedAt
      ]);
      return badge;
    } else {
      const db = this.readJsonDb();
      if (!db.badges.some(b => b.userId === badge.userId && b.badgeType === badge.badgeType)) {
        db.badges.push(badge);
        this.writeJsonDb(db);
      }
      return badge;
    }
  }

  public async getBadgesByUserId(userId: string): Promise<Badge[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM badges WHERE user_id = $1 ORDER BY earned_at DESC', [userId]);
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        badgeType: row.badge_type as BadgeType,
        title: row.title,
        description: row.description,
        earnedAt: row.earned_at
      }));
    } else {
      const db = this.readJsonDb();
      return db.badges.filter(b => b.userId === userId);
    }
  }

  // ==========================================
  // USER CHALLENGE METHODS
  // ==========================================

  public async createUserChallenge(uc: UserChallenge): Promise<UserChallenge> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO user_challenges (id, user_id, challenge_id, status, progress, started_at, completed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`;
      await this.pool.query(q, [
        uc.id, uc.userId, uc.challengeId, uc.status, uc.progress, uc.startedAt, uc.completedAt
      ]);
      return uc;
    } else {
      const db = this.readJsonDb();
      db.userChallenges.push(uc);
      this.writeJsonDb(db);
      return uc;
    }
  }

  public async getUserChallengesByUserId(userId: string): Promise<UserChallenge[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM user_challenges WHERE user_id = $1', [userId]);
      return res.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        challengeId: row.challenge_id,
        status: row.status as 'in_progress' | 'completed',
        progress: row.progress,
        startedAt: row.started_at,
        completedAt: row.completed_at
      }));
    } else {
      const db = this.readJsonDb();
      return db.userChallenges.filter(uc => uc.userId === userId);
    }
  }

  public async getUserChallenge(userId: string, challengeId: string): Promise<UserChallenge | null> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM user_challenges WHERE user_id = $1 AND challenge_id = $2', [userId, challengeId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        challengeId: row.challenge_id,
        status: row.status as 'in_progress' | 'completed',
        progress: row.progress,
        startedAt: row.started_at,
        completedAt: row.completed_at
      };
    } else {
      const db = this.readJsonDb();
      return db.userChallenges.find(uc => uc.userId === userId && uc.challengeId === challengeId) || null;
    }
  }

  public async updateUserChallengeProgress(userId: string, challengeId: string, progress: number, status: 'in_progress' | 'completed', completedAt: string | null): Promise<void> {
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        'UPDATE user_challenges SET progress = $1, status = $2, completed_at = $3 WHERE user_id = $4 AND challenge_id = $5',
        [progress, status, completedAt, userId, challengeId]
      );
    } else {
      const db = this.readJsonDb();
      const uc = db.userChallenges.find(x => x.userId === userId && x.challengeId === challengeId);
      if (uc) {
        uc.progress = progress;
        uc.status = status;
        uc.completedAt = completedAt;
        this.writeJsonDb(db);
      }
    }
  }

  // ==========================================
  // EDUCATION HUB METHODS
  // ==========================================

  public async saveQuizProgress(userId: string, quizId: string, score: number, completedAt: string): Promise<void> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO quiz_progress (user_id, quiz_id, score, completed_at)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, quiz_id) 
                 DO UPDATE SET score = EXCLUDED.score, completed_at = EXCLUDED.completed_at`;
      await this.pool.query(q, [userId, quizId, score, completedAt]);
    } else {
      const db = this.readJsonDb();
      db.quizProgress = db.quizProgress.filter(qp => !(qp.userId === userId && qp.quizId === quizId));
      db.quizProgress.push({ userId, quizId, score, completedAt });
      this.writeJsonDb(db);
    }
  }

  public async getQuizProgress(userId: string): Promise<{ userId: string; quizId: string; score: number; completedAt: string }[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM quiz_progress WHERE user_id = $1', [userId]);
      return res.rows.map(row => ({
        userId: row.user_id,
        quizId: row.quiz_id,
        score: row.score,
        completedAt: row.completed_at
      }));
    } else {
      const db = this.readJsonDb();
      return db.quizProgress.filter(qp => qp.userId === userId);
    }
  }

  public async saveReadProgress(userId: string, articleId: string, completedAt: string): Promise<void> {
    if (this.usePostgres && this.pool) {
      const q = `INSERT INTO read_progress (user_id, article_id, completed_at)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, article_id) DO NOTHING`;
      await this.pool.query(q, [userId, articleId, completedAt]);
    } else {
      const db = this.readJsonDb();
      if (!db.readProgress.some(rp => rp.userId === userId && rp.articleId === articleId)) {
        db.readProgress.push({ userId, articleId, completedAt });
        this.writeJsonDb(db);
      }
    }
  }

  public async getReadProgress(userId: string): Promise<{ userId: string; articleId: string; completedAt: string }[]> {
    if (this.usePostgres && this.pool) {
      const res = await this.pool.query('SELECT * FROM read_progress WHERE user_id = $1', [userId]);
      return res.rows.map(row => ({
        userId: row.user_id,
        articleId: row.article_id,
        completedAt: row.completed_at
      }));
    } else {
      const db = this.readJsonDb();
      return db.readProgress.filter(rp => rp.userId === userId);
    }
  }

  // Helper method for clearing database for test suites
  public async clearAllData(): Promise<void> {
    if (this.usePostgres && this.pool) {
      await this.pool.query('TRUNCATE TABLE read_progress, quiz_progress, user_challenges, badges, goals, footprints, users CASCADE');
    } else {
      this.writeJsonDb(JSON.parse(JSON.stringify(defaultDbState)));
    }
  }
}

// Single instance of DB Client
export const dbClient = new DatabaseClient();
export default dbClient;
