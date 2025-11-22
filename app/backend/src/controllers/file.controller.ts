import { StatusCodes } from 'http-status-codes';
import { singleton } from 'tsyringe';

import { LoggerConfig } from '@/config';
import { FileRepository } from '@/repositories';

@singleton()
export class FileController {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly logger: LoggerConfig,
  ) {}

  async create(data: any) {
    try {
      const file = await this.fileRepository.create(data);

      this.logger.info('File created', { fileId: file._id });

      return {
        statusCode: StatusCodes.CREATED,
        body: { success: true, data: file },
      };
    } catch (error: any) {
      this.logger.error('Error creating file', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getById(id: string) {
    try {
      const file = await this.fileRepository.findById(id);

      if (!file) {
        return {
          statusCode: StatusCodes.NOT_FOUND,
          body: { success: false, error: 'File not found' },
        };
      }

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: file },
      };
    } catch (error: any) {
      this.logger.error('Error getting file', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }

  async getAll(filters?: { conversation_id?: string }) {
    try {
      const files = await this.fileRepository.findAll(filters);

      return {
        statusCode: StatusCodes.OK,
        body: { success: true, data: files },
      };
    } catch (error: any) {
      this.logger.error('Error getting files', { error: error.message });

      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: { success: false, error: error.message },
      };
    }
  }
}
