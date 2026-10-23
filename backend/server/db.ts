import { fileURLToPath } from 'url';
import fs from 'fs';
import type { ModelInfo, PredictionMethod } from './predictionEngine.js';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  preferred_language: 'en' | 'te' | 'hi';
  created_at: string;
}

export interface ClinicalSignal {
  name: string;
  key: string;
  value: string | number;
  unit: string;
  normalRange: string;
  status: 'normal' | 'elevated' | 'high' | 'critical' | 'low';
  impactDescription: string;
}

export interface PredictionRecord {
  id: string;
  user_id: string;
  input_type: 'manual' | 'pdf';
  file_name?: string;
  condition_id: string;
  predicted_condition: string;
  predicted_condition_te: string;
  predicted_condition_hi: string;
  confidence: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Severe';
  signals: ClinicalSignal[];
  summary: string;
  summary_te: string;
  summary_hi: string;
  recommendations: string[];
  recommendations_te: string[];
  recommendations_hi: string[];
  raw_input: Record<string, any>;
  method?: PredictionMethod;
  model_info?: ModelInfo;
  secondary_predictions?: Array<{ disease_name: string; risk_level: string; confidence: number; method?: PredictionMethod }>;
  created_at: string;
}

interface DatabaseSchema {
  users: User[];
  predictions: PredictionRecord[];
}

const DB_FILE = process.env.DATABASE_PATH || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'health_records.json');

// Ensure directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = { users: [], predictions: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file:', error);
    return { users: [], predictions: [] };
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (error) {
    console.error('Error writing to database:', error);
    throw error;
  }
}

// Password hashing using Node.js scrypt with unique salt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export const db = {
  // User operations
  findUserByEmail(email: string): User | undefined {
    const data = readDb();
    return data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  findUserById(id: string): User | undefined {
    const data = readDb();
    return data.users.find(u => u.id === id);
  },

  createUser(userData: Omit<User, 'id' | 'created_at'>): User {
    const data = readDb();
    const newUser: User = {
      id: crypto.randomUUID(),
      ...userData,
      email: userData.email.trim().toLowerCase(),
      created_at: new Date().toISOString(),
    };
    data.users.push(newUser);
    writeDb(data);
    return newUser;
  },

  updateUser(id: string, updates: Partial<Pick<User, 'name' | 'preferred_language' | 'password_hash'>>): User | null {
    const data = readDb();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    data.users[idx] = { ...data.users[idx], ...updates };
    writeDb(data);
    return data.users[idx];
  },

  // Prediction operations (strictly filtered per user)
  savePrediction(predictionData: Omit<PredictionRecord, 'id' | 'created_at'>): PredictionRecord {
    const data = readDb();
    const newRecord: PredictionRecord = {
      id: crypto.randomUUID(),
      ...predictionData,
      created_at: new Date().toISOString(),
    };
    data.predictions.push(newRecord);
    writeDb(data);
    return newRecord;
  },

  getPredictionsByUserId(userId: string): PredictionRecord[] {
    const data = readDb();
    return data.predictions
      .filter(p => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getPredictionById(id: string, userId: string): PredictionRecord | null {
    const data = readDb();
    const record = data.predictions.find(p => p.id === id && p.user_id === userId);
    return record || null;
  },

  deletePrediction(id: string, userId: string): boolean {
    const data = readDb();
    const initialLen = data.predictions.length;
    data.predictions = data.predictions.filter(p => !(p.id === id && p.user_id === userId));
    if (data.predictions.length !== initialLen) {
      writeDb(data);
      return true;
    }
    return false;
  },
};
