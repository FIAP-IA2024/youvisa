import mongoose, { Schema, model, Model } from 'mongoose';
import { logger } from './logger';

/**
 * Telegram-update deduplication cache.
 *
 * Telegram retries webhook deliveries for ~24 h if it doesn't get a 200
 * response within 60 s. Network blips or our own slow Claude calls can
 * cause a single user message to be delivered twice — and if both
 * deliveries reach our pipeline, we run intent classification, save the
 * interaction log, and send the bot reply twice. From the user's
 * perspective: a duplicate bubble appears.
 *
 * Strategy: a tiny Mongo collection keyed by `update_id` with a TTL
 * index of 1 h. The pipeline runs only if we successfully insert the
 * `update_id` (Mongo's E11000 duplicate-key error means another worker
 * already claimed it).
 */

interface IProcessedUpdate {
  update_id: number;
  processed_at: Date;
}

const processedUpdateSchema = new Schema<IProcessedUpdate>(
  {
    update_id: { type: Number, required: true, unique: true },
    processed_at: {
      type: Date,
      required: true,
      default: () => new Date(),
      // TTL: drop the row 1 h after it was written
      expires: 3600,
    },
  },
  { collection: 'processed_updates' },
);

let modelInstance: Model<IProcessedUpdate> | null = null;

function ProcessedUpdateModel(): Model<IProcessedUpdate> {
  if (modelInstance) return modelInstance;
  modelInstance =
    (mongoose.models.ProcessedUpdate as Model<IProcessedUpdate>) ??
    model<IProcessedUpdate>('ProcessedUpdate', processedUpdateSchema);
  return modelInstance;
}

/**
 * Returns true if this `update_id` is brand-new (we should run the
 * pipeline). Returns false on the second+ delivery — caller should
 * just 200 OK back to Telegram and skip work.
 */
export async function claimUpdate(updateId: number): Promise<boolean> {
  try {
    await ProcessedUpdateModel().create({ update_id: updateId });
    return true;
  } catch (err: any) {
    // E11000 = duplicate key (Mongo). Anything else, log + treat as
    // already-claimed (fail safe — duplicate suppression should never
    // turn into duplicate processing on a transient DB error).
    if (err?.code === 11000) {
      logger.info({ update_id: updateId }, 'duplicate telegram update suppressed');
      return false;
    }
    logger.warn({ err, update_id: updateId }, 'claimUpdate fell back to suppress on error');
    return false;
  }
}
