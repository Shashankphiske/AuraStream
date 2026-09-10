import dotenv from 'dotenv';
import crypto from 'crypto';
import { z } from 'zod';

dotenv.config();

function getOrGenerateSecret(val: string | undefined, name: string): string {
  if (val && val.trim().length >= 32) {
    return val.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`CRITICAL SECURITY CONFIGURATION ERROR: ${name} must be set in environment variables and be at least 32 characters long.`);
  }
  // Secure random fallback for testing/dev with warning
  console.warn(`[SECURITY WARNING] Ephemeral secret generated for ${name}. Do not use in production!`);
  return crypto.randomBytes(32).toString('hex');
}

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_PATH: z.string().default('./data/aurastream.db'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  YOUTUBE_API_KEY: z.string().optional().default(''),
});

const rawEnv = {
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || '127.0.0.1',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: process.env.DB_PATH || './data/aurastream.db',
  JWT_ACCESS_SECRET: getOrGenerateSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: getOrGenerateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '15m',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
};

export const env = envSchema.parse(rawEnv);
