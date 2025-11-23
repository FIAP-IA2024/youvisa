import mongoose from 'mongoose';
import { env } from './env.config';
import { logger } from './logger.config';

export class DatabaseConfig {
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      logger.info('Using cached MongoDB connection');
      return;
    }

    try {
      logger.info('Creating new MongoDB connection');
      await mongoose.connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DATABASE,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      this.isConnected = true;
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection error', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    logger.info('MongoDB disconnected');
  }
}

export const database = new DatabaseConfig();
