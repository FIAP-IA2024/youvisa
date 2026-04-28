import mongoose from 'mongoose';
import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

let connected = false;

export async function connectMongo(): Promise<typeof mongoose> {
  if (connected) return mongoose;
  const env = getEnv();
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DATABASE,
    serverSelectionTimeoutMS: 10_000,
  });
  connected = true;
  logger.info(
    { uri: env.MONGODB_URI.replace(/:[^@/]+@/, ':***@'), db: env.MONGODB_DATABASE },
    'mongo connected',
  );
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
