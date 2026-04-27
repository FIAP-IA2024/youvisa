/**
 * End-to-end document handling: download from Telegram, validate
 * quality, upload to MinIO, classify with Claude Vision, persist File
 * record via API, notify the user.
 *
 * Sprint 4 Phase 6 — replaces the AWS Lambda classifier flow.
 */

import { saveFile } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { uploadObject } from '@/storage/minio';
import { sendMessage } from '@/telegram/client';
import { getEnv } from '@/config/env';
import { classifyDocumentImage } from './claude-vision';
import { validateImage } from '@/lib/validation-client';
import { FileModel } from '@/db/repositories';
import mongoose from 'mongoose';

const env = getEnv();

export interface DocumentFlowInput {
  imageBytes: Buffer;
  mimeType: string;
  fileName: string;
  telegramFileId: string;
  conversation_id: string;
  /** ObjectId of the saved Message (caller persists message first, passes _id) */
  message_object_id: string;
  user_id: string;
  chat_id: string | number;
}

export interface DocumentFlowResult {
  uploaded: boolean;
  validated: boolean;
  classified: boolean;
  document_type?: string;
  reason?: string;
}

const INVALID_DOC_HELP =
  'Não conseguimos identificar o documento enviado.\n\n' +
  'Por favor, envie novamente seguindo estas dicas:\n' +
  '• Certifique-se de que o documento está bem iluminado\n' +
  '• Capture o documento por inteiro\n' +
  '• Evite reflexos e sombras\n' +
  '• A imagem deve estar nítida (sem borrões)';

export async function handleDocument(input: DocumentFlowInput): Promise<DocumentFlowResult> {
  // 1. Validate quality (deterministic, OpenCV)
  logger.info({ size: input.imageBytes.length }, 'document flow: validating');
  const validation = await validateImage(
    input.imageBytes,
    input.mimeType,
    input.fileName,
  );

  if (!validation.valid) {
    logger.info(
      { reason: validation.reason, details: validation.details },
      'document flow: validation rejected',
    );
    await sendMessage(
      input.chat_id,
      `${validation.reason}\n\nPor favor, envie a imagem novamente seguindo estas dicas:\n• Certifique-se de que o documento está bem iluminado\n• Capture o documento por inteiro\n• Evite reflexos e sombras\n• A imagem deve estar nítida (sem borrões)`,
    );
    return {
      uploaded: false,
      validated: false,
      classified: false,
      reason: validation.reason,
    };
  }

  // 2. Upload to MinIO
  const s3Key = `${input.telegramFileId}_${Date.now()}_${input.fileName}`;
  await uploadObject(s3Key, input.imageBytes, input.mimeType);
  logger.info({ s3Key }, 'document flow: uploaded');

  // 3. Save File record
  await saveFile({
    conversation_id: input.conversation_id,
    message_id: input.message_object_id,
    file_id: input.telegramFileId,
    s3_bucket: env.S3_BUCKET,
    s3_key: s3Key,
    original_filename: input.fileName,
    file_size: input.imageBytes.length,
    mime_type: input.mimeType,
  });

  // 4. Classify with Claude Vision
  logger.info('document flow: classifying with Claude Vision');
  const classification = await classifyDocumentImage(input.imageBytes, input.mimeType);
  logger.info(
    { document_type: classification.document_type, confidence: classification.confidence, ms: classification.duration_ms },
    'document flow: classified',
  );

  // 5. Update File record with classification (direct mongo for speed)
  try {
    await FileModel().findOneAndUpdate(
      { s3_key: s3Key },
      {
        document_type: classification.document_type,
        classification_confidence: classification.confidence,
        classification_status: 'completed',
        classified_at: new Date(),
      },
    );
  } catch (err) {
    logger.warn({ err }, 'failed to persist classification to file record');
  }

  // 6. Notify user via Telegram
  let userMessage: string;
  if (classification.document_type === 'Documento inválido') {
    userMessage = INVALID_DOC_HELP;
  } else {
    userMessage = `Seu documento foi classificado como: <b>${classification.document_type}</b>`;
  }
  await sendMessage(input.chat_id, userMessage);

  return {
    uploaded: true,
    validated: true,
    classified: true,
    document_type: classification.document_type,
  };
}

// Re-export for module resolution
export { mongoose };
