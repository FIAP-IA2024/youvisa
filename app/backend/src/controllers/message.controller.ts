import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'tsyringe';

import { LoggerConfig } from '@/config';
import { MessageRepository } from '@/repositories';

@injectable()
export class MessageController {
  constructor(
    @inject('MessageRepository') private readonly messageRepository: MessageRepository,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  async create(data: any) {
    try {
      const message = await this.messageRepository.create(data);

      this.logger.info('Message created', { messageId: message._id });

      return {
        statusCode: StatusCodes.CREATED,
        body: { success: true, data: message },
      };
    } catch (error: any) {
      this.logger.error('Error creating message', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getById(id: string) {
    try {
      const message = await this.messageRepository.findById(id);

      if (!message) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Message not found' },
        };
      }

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: message },
      };
    } catch (error: any) {
      this.logger.error('Error getting message', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getAll(filters?: {
    conversation_id?: string;
    message_type?: string;
  }) {
    try {
      const messages = await this.messageRepository.findAll(filters);

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: messages },
      };
    } catch (error: any) {
      this.logger.error('Error getting messages', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }
}
