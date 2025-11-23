import mongoose from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { EnvConfig } from './env.config';
import { LoggerConfig } from './logger.config';

@injectable()
export class DatabaseConfig {
  private isConnected = false;

  constructor(
    @inject('EnvConfig') private readonly env: EnvConfig,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  public async connect(): Promise<void> {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      this.logger.info('Using cached MongoDB connection');
      return;
    }

    try {
      this.logger.info('Creating new MongoDB connection');

      await mongoose.connect(this.env.MONGODB_URI, {
        dbName: this.env.MONGODB_DATABASE,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      this.logger.info('MongoDB connected successfully');
    } catch (error) {
      this.logger.error('MongoDB connection error', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await mongoose.disconnect();
    this.isConnected = false;
    this.logger.info('MongoDB disconnected');
  }
}
