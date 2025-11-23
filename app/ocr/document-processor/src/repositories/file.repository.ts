import { FileModel, IFile } from '../models';
import { ProcessingStatus, ExtractionResult } from '../types';

export class FileRepository {
  async findByS3Key(bucket: string, key: string): Promise<IFile | null> {
    return await FileModel.findOne({ s3_bucket: bucket, s3_key: key });
  }

  async updateOCRStatus(
    fileId: string,
    status: ProcessingStatus,
    error?: string
  ): Promise<IFile | null> {
    return await FileModel.findByIdAndUpdate(
      fileId,
      {
        ocr_status: status,
        ...(error && { ocr_error: error }),
      },
      { new: true }
    );
  }

  async updateOCRResult(
    fileId: string,
    result: {
      status: ProcessingStatus;
      processed_at: Date;
      result: ExtractionResult;
    }
  ): Promise<IFile | null> {
    return await FileModel.findByIdAndUpdate(
      fileId,
      {
        ocr_status: result.status,
        ocr_processed_at: result.processed_at,
        'metadata.ocr_result': result.result,
      },
      { new: true }
    );
  }
}

export const fileRepository = new FileRepository();
