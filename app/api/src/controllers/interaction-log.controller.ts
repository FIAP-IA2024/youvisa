import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'tsyringe';

import { LoggerConfig } from '@/config';
import { InteractionLogRepository } from '@/repositories';

@injectable()
export class InteractionLogController {
  constructor(
    @inject('InteractionLogRepository')
    private readonly repo: InteractionLogRepository,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  async create(data: {
    session_id: string;
    user_id: string;
    conversation_id: string;
    channel?: string;
    user_message: string;
    intent: string;
    intent_confidence?: number;
    entities?: Record<string, unknown>;
    agent_trace?: Array<{
      step: string;
      started_at: Date | string;
      duration_ms: number;
      output: Record<string, unknown>;
      error?: string;
    }>;
    response?: string;
    response_skipped?: boolean;
    total_latency_ms?: number;
  }) {
    try {
      const log = await this.repo.create(data as any);
      this.logger.info('Interaction log created', {
        id: log._id,
        intent: log.intent,
      });

      return {
        statusCode: StatusCodes.CREATED,
        body: { success: true, data: log },
      };
    } catch (error: any) {
      this.logger.error('Error creating interaction log', {
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
      const log = await this.repo.findById(id);
      if (!log) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Interaction log not found' },
        };
      }
      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: log },
      };
    } catch (error: any) {
      this.logger.error('Error getting interaction log', {
        error: error.message,
      });
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getAll(filters?: {
    intent?: string;
    user_id?: string;
    channel?: string;
  }) {
    try {
      const logs = await this.repo.findAll(filters);
      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: logs },
      };
    } catch (error: any) {
      this.logger.error('Error listing interaction logs', {
        error: error.message,
      });
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getByUserId(userId: string) {
    try {
      const logs = await this.repo.findByUserId(userId);
      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: logs },
      };
    } catch (error: any) {
      this.logger.error('Error getting interactions by user', {
        error: error.message,
      });
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getByConversationId(conversationId: string) {
    try {
      const logs = await this.repo.findByConversationId(conversationId);
      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: logs },
      };
    } catch (error: any) {
      this.logger.error('Error getting interactions by conversation', {
        error: error.message,
      });
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }
}
