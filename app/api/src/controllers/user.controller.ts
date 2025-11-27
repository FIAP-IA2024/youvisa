import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'tsyringe';

import { LoggerConfig } from '@/config';
import { UserRepository } from '@/repositories';

@injectable()
export class UserController {
  constructor(
    @inject('UserRepository') private readonly userRepository: UserRepository,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  async create(data: {
    telegram_id: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  }) {
    try {
      const user = await this.userRepository.create(data);

      this.logger.info('User created', { userId: user._id });

      return {
        statusCode: StatusCodes.CREATED,
        body: { success: true, data: user },
      };
    } catch (error: any) {
      this.logger.error('Error creating user', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getAll() {
    try {
      const users = await this.userRepository.findAll();

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: users },
      };
    } catch (error: any) {
      this.logger.error('Error getting users', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getById(id: string) {
    try {
      const user = await this.userRepository.findById(id);

      if (!user) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'User not found' },
        };
      }

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: user },
      };
    } catch (error: any) {
      this.logger.error('Error getting user', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async updateById(id: string, data: Partial<any>) {
    try {
      const user = await this.userRepository.updateById(id, data);

      if (!user) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'User not found' },
        };
      }

      this.logger.info('User updated', { userId: user._id });

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: user },
      };
    } catch (error: any) {
      this.logger.error('Error updating user', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async upsertByTelegramId(telegramId: string, data: Partial<any>) {
    try {
      const user = await this.userRepository.upsertByTelegramId(telegramId, {
        telegram_id: telegramId,
        ...data,
      });

      this.logger.info('User upserted', { userId: user._id });

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: user },
      };
    } catch (error: any) {
      this.logger.error('Error upserting user', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async deleteById(id: string) {
    try {
      const user = await this.userRepository.deleteById(id);

      if (!user) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'User not found' },
        };
      }

      this.logger.info('User deleted', { userId: user._id });

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: user },
      };
    } catch (error: any) {
      this.logger.error('Error deleting user', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }
}
