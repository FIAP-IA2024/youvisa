import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { database, logger } from './config';
import { ocrOrchestratorService } from './services';
import { S3Event } from './types';

// Global connections (reused between invocations)
let isInitialized = false;

async function initialize() {
  if (isInitialized) return;

  await database.connect();
  isInitialized = true;
  logger.info('Lambda initialized');
}

export const handler = async (event: SQSEvent, context: Context) => {
  logger.info('Lambda invocation started', {
    requestId: context.awsRequestId,
    recordCount: event.Records.length,
  });

  try {
    await initialize();

    // Process each SQS message
    const results = await Promise.allSettled(
      event.Records.map((record) => processRecord(record))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    logger.info('Batch processing completed', {
      total: results.length,
      succeeded,
      failed,
    });

    if (failed > 0) {
      throw new Error(`${failed} records failed processing`);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    logger.error('Lambda execution failed', { error });
    throw error;
  }
};

async function processRecord(sqsRecord: SQSRecord): Promise<void> {
  // Parse S3 event from SQS message body
  const s3Event: S3Event = JSON.parse(sqsRecord.body);
  const s3Record = s3Event.Records[0];

  const bucket = s3Record.s3.bucket.name;
  const key = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));

  logger.info('Processing S3 file', { bucket, key });

  try {
    await ocrOrchestratorService.processDocument(bucket, key);
    logger.info('Document processed successfully', { bucket, key });
  } catch (error) {
    logger.error('Failed to process document', { bucket, key, error });
    throw error;
  }
}
