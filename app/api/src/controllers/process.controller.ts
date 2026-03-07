import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'tsyringe';

import { EnvConfig, LoggerConfig } from '@/config';
import { ProcessRepository } from '@/repositories';

@injectable()
export class ProcessController {
  constructor(
    @inject('ProcessRepository')
    private readonly processRepository: ProcessRepository,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
    @inject('EnvConfig') private readonly env: EnvConfig,
  ) {}

  async create(data: {
    user_id: string;
    conversation_id?: string;
    visa_type: string;
    destination_country: string;
    notes?: string;
  }) {
    try {
      const process = await this.processRepository.create(data as any);
      this.logger.info('Process created', { processId: process._id });

      return {
        statusCode: StatusCodes.CREATED,
        body: { success: true, data: process },
      };
    } catch (error: any) {
      this.logger.error('Error creating process', {
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
      const process = await this.processRepository.findById(id);

      if (!process) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Process not found' },
        };
      }

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: process },
      };
    } catch (error: any) {
      this.logger.error('Error getting process', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getAll(filters?: {
    status?: string;
    user_id?: string;
    visa_type?: string;
  }) {
    try {
      const processes = await this.processRepository.findAll(filters);

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: processes },
      };
    } catch (error: any) {
      this.logger.error('Error getting processes', {
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
      const processes = await this.processRepository.findByUserId(userId);

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: processes },
      };
    } catch (error: any) {
      this.logger.error('Error getting processes by user', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getByTelegramId(telegramId: string) {
    try {
      const processes =
        await this.processRepository.findByTelegramId(telegramId);

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: processes },
      };
    } catch (error: any) {
      this.logger.error('Error getting processes by telegram', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async updateStatus(
    id: string,
    data: { status: string; reason: string; changed_by?: string },
  ) {
    try {
      const { process, error } = await this.processRepository.updateStatus(
        id,
        data.status,
        data.reason,
        data.changed_by,
      );

      if (error) {
        return {
          statusCode: StatusCodes.BAD_REQUEST,
          body: { success: false, error },
        };
      }

      if (!process) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Process not found' },
        };
      }

      this.logger.info('Process status updated', {
        processId: id,
        newStatus: data.status,
      });

      // Fire webhook notification if configured
      if (this.env.N8N_STATUS_WEBHOOK_URL) {
        this._notifyStatusChange(
          id,
          String(process.user_id),
          process.status_history.at(-2)?.to_status ||
            process.status_history[0]?.from_status ||
            'recebido',
          data.status,
          data.reason,
        );
      }

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: process },
      };
    } catch (error: any) {
      this.logger.error('Error updating process status', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async addDocument(processId: string, data: { file_id: string }) {
    try {
      const process = await this.processRepository.addDocument(
        processId,
        data.file_id,
      );

      if (!process) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Process not found' },
        };
      }

      this.logger.info('Document added to process', {
        processId,
        fileId: data.file_id,
      });

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: process },
      };
    } catch (error: any) {
      this.logger.error('Error adding document to process', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getStatusHistory(id: string) {
    try {
      const process = await this.processRepository.getStatusHistory(id);

      if (!process) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'Process not found' },
        };
      }

      return {
        statusCode: StatusCodes.OK,
        body: {
          success: true,
          data: {
            status: process.status,
            history: process.status_history,
          },
        },
      };
    } catch (error: any) {
      this.logger.error('Error getting status history', {
        error: error.message,
      });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  private async _notifyStatusChange(
    processId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    reason: string,
  ) {
    try {
      await fetch(this.env.N8N_STATUS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_id: processId,
          user_id: userId,
          old_status: oldStatus,
          new_status: newStatus,
          reason,
        }),
      });
      this.logger.info('Status webhook notified', { processId, newStatus });
    } catch (error: any) {
      this.logger.error('Failed to notify status webhook', {
        error: error.message,
      });
    }
  }
}
