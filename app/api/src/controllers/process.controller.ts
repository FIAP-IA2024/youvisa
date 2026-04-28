import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'tsyringe';

import { LoggerConfig } from '@/config';
import { ProcessRepository } from '@/repositories';
import { StatusNotifierService } from '@/services/status-notifier.service';

@injectable()
export class ProcessController {
  constructor(
    @inject('ProcessRepository')
    private readonly processRepository: ProcessRepository,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
    @inject('StatusNotifierService')
    private readonly statusNotifier: StatusNotifierService,
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
    data: { status: string; reason?: string; changed_by?: string },
  ) {
    try {
      const { process, error } = await this.processRepository.updateStatus(
        id,
        data.status,
        data.reason || '',
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

      // Send Telegram notification via deterministic template (Sprint 4 — replaces n8n).
      // Best-effort: failure to notify must not roll back the FSM transition.
      const previousStatus =
        process.status_history.at(-1)?.from_status || 'recebido';
      this.statusNotifier
        .notifyStatusChange(id, previousStatus, data.status, data.reason || '')
        .catch((err) => {
          this.logger.error('Status notification failed (non-fatal)', {
            error: err.message,
            processId: id,
          });
        });

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

}
