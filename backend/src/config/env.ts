import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from backend folder first, then project root fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/milk_and_more'),
  JWT_SECRET: z.string().default('default_milk_and_more_jwt_secret_dev_32char_key!'),
  CORS_ORIGIN: z.string().default('*'),
  BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),
  MAP_PROVIDER: z.string().default('osm'),
  MAP_API_KEY: z.string().optional().default(''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
