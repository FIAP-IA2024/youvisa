import { StatusCodes } from 'http-status-codes';
import { singleton } from 'tsyringe';

import { LoggerConfig } from '@/config';
import { ConversationRepository } from '@/repositories';

@singleton()
export class ConversationController {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly logger: LoggerConfig,
  ) {}

  async create(data: any) {
    try {
      const conversation = await this.conversationRepository.create(data);

      this.logger.info('Conversation created', {
        conversationId: conversation._id,
      });

      return {
        statusCode: StatusCodes.CREATED,
        body: { success: true, data: conversation },
      };
    } catch (error: any) {
      this.logger.error('Error creating conversation', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getById(id: string) {
    try {
      const conversation = await this.conversationRepository.findById(id);

      if (!conversation) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Conversation not found' },
        };
      }

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: conversation },
      };
    } catch (error: any) {
      this.logger.error('Error getting conversation', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getAll(filters?: { status?: string; channel?: string }) {
    try {
      const conversations = await this.conversationRepository.findAll(filters);

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: conversations },
      };
    } catch (error: any) {
      this.logger.error('Error getting conversations', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async updateById(id: string, data: any) {
    try {
      const conversation = await this.conversationRepository.updateById(
        id,
        data,
      );

      if (!conversation) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Conversation not found' },
        };
      }

      this.logger.info('Conversation updated', {
        conversationId: conversation._id,
      });

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: conversation },
      };
    } catch (error: any) {
      this.logger.error('Error updating conversation', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async upsert(userId: string, channel: string, chatId: string, data: any) {
    try {
      const conversation =
        await this.conversationRepository.upsertByUserAndChannel(
          userId,
          channel,
          chatId,
          { user_id: userId, channel, chat_id: chatId, ...data },
        );

      this.logger.info('Conversation upserted', {
        conversationId: conversation._id,
      });

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: conversation },
      };
    } catch (error: any) {
      this.logger.error('Error upserting conversation', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }
}
