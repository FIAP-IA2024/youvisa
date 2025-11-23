import { fileRepository } from '../../repositories';
import { mockTextractService } from '../aws/mock-textract.service';
import { textractService } from '../aws/textract.service';
import { classifierService } from '../classification/classifier.service';
import { ProcessingStatus, ExtractionResult } from '../../types';
import { env, logger } from '../../config';

export class OCROrchestratorService {
  private textractService = env.USE_MOCK_TEXTRACT ? mockTextractService : textractService;

  async processDocument(bucket: string, key: string): Promise<void> {
    logger.info('Processing document', { bucket, key, useMock: env.USE_MOCK_TEXTRACT });

    // 1. Find File in MongoDB
    const file = await fileRepository.findByS3Key(bucket, key);

    if (!file) {
      throw new Error(`File not found in database: ${bucket}/${key}`);
    }

    // 2. Update status to processing
    await fileRepository.updateOCRStatus(file._id.toString(), ProcessingStatus.PROCESSING);

    try {
      // 3. Classify document type
      const docType = classifierService.classify(
        {
          mime_type: file.mime_type,
          file_size: file.file_size,
          file_name: file.original_filename,
        },
        key
      );

      logger.info('Document classified', { fileId: file._id, documentType: docType });

      // 4. Extract data using Textract (mock or real based on env)
      const extractedData = await this.textractService.analyzeDocument(bucket, key, docType);

      // 5. Update File with OCR result
      await fileRepository.updateOCRResult(file._id.toString(), {
        status: ProcessingStatus.COMPLETED,
        processed_at: new Date(),
        result: extractedData as ExtractionResult,
      });

      logger.info('Document processing completed', {
        fileId: file._id,
        documentType: extractedData.document_type,
        confidence: extractedData.confidence,
      });
    } catch (error) {
      logger.error('Error processing document', { fileId: file._id, error });
      await fileRepository.updateOCRStatus(
        file._id.toString(),
        ProcessingStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }
}

export const ocrOrchestratorService = new OCROrchestratorService();
