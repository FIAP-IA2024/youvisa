import { Hono } from 'hono';
import { runPipeline } from '@/orchestrator/pipeline';
import {
  saveMessage,
  upsertConversation,
  upsertUser,
} from '@/lib/api-client';
import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';
import { claimUpdate } from '@/lib/update-dedup';
import { getFile, sendChatAction, sendMessage } from '@/telegram/client';
import { updateSchema, type TelegramUpdate } from '@/telegram/types';
import { handleDocument } from '@/classifier/document-flow';

export const telegramWebhookRoute = new Hono();
const env = getEnv();

/**
 * POST /telegram/webhook
 * Receives Telegram bot updates. Telegram pushes here when the user
 * sends a message; we run the multi-agent pipeline (text) or the
 * document-classification flow (photo/document) and respond via
 * Telegram sendMessage.
 *
 * NOTE: Telegram requires this endpoint to respond within ~60s.
 * The pipeline can take 10-15s with LLM calls; document flow can be
 * 20-25s including vision. Both are within the limit.
 */
telegramWebhookRoute.post('/telegram/webhook', async (c) => {
  // Authenticate: when TELEGRAM_WEBHOOK_SECRET is set, Telegram echoes
  // it back in this header. Reject anything else fast — no Claude
  // tokens burned on forged updates.
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const provided = c.req.header('x-telegram-bot-api-secret-token');
    if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn({ provided }, 'telegram webhook: invalid secret token');
      return c.json({ ok: false, error: 'unauthorized' }, 401);
    }
  }

  let update: TelegramUpdate;
  try {
    const body = await c.req.json();
    update = updateSchema.parse(body);
  } catch (err) {
    logger.warn({ err }, 'telegram webhook: invalid payload');
    // Return 200 so Telegram doesn't keep retrying the same bad update
    return c.json({ ok: false, error: 'invalid payload' }, 200);
  }

  // Idempotency: Telegram retries delivery on slow/failed acks. Drop
  // duplicates so the pipeline runs (and the bot replies) exactly once
  // per user message.
  const claimed = await claimUpdate(update.update_id);
  if (!claimed) {
    return c.json({ ok: true, duplicate: true });
  }

  const msg = update.message;
  if (!msg || !msg.from) {
    logger.debug({ update_id: update.update_id }, 'telegram webhook: no message in update');
    return c.json({ ok: true });
  }

  // Show "typing…" immediately — keeps the user's eye busy while the
  // pipeline (~10 s) runs. Fire-and-forget.
  void sendChatAction(msg.chat.id, msg.photo || msg.document ? 'upload_document' : 'typing');

  // Document/photo path: download -> validate -> MinIO -> classify -> notify
  if (msg.photo || msg.document) {
    return handleDocumentMessage(update, c);
  }

  if (!msg.text) {
    return c.json({ ok: true });
  }

  try {
    // 1. Upsert user
    const user = await upsertUser({
      telegram_id: String(msg.from.id),
      username: msg.from.username,
      first_name: msg.from.first_name,
      last_name: msg.from.last_name,
      language_code: msg.from.language_code,
      is_bot: msg.from.is_bot,
    });

    // 2. Upsert conversation
    const conversation = await upsertConversation({
      user_id: user._id,
      channel: 'telegram',
      chat_id: String(msg.chat.id),
      status: 'active',
    });

    // 3. Save inbound message
    await saveMessage({
      conversation_id: conversation._id,
      message_id: String(msg.message_id),
      user_id: user._id,
      text: msg.text,
      message_type: 'text',
      direction: 'incoming',
      timestamp: new Date(msg.date * 1000),
    });

    // 4. Run multi-agent pipeline
    const out = await runPipeline({
      user_id: user._id,
      conversation_id: conversation._id,
      chat_id: String(msg.chat.id),
      user_message: msg.text,
    });

    // 5. Send bot reply (unless handoff suppresses it)
    if (!out.response_skipped && out.response) {
      const sent = await sendMessage(msg.chat.id, out.response);

      if (sent) {
        // Save outbound message
        await saveMessage({
          conversation_id: conversation._id,
          message_id: `bot-${Date.now()}`,
          user_id: user._id,
          text: out.response,
          message_type: 'text',
          direction: 'outgoing',
          metadata: { intent: out.intent, intent_confidence: out.intent_confidence },
        });
      }
    }

    return c.json({
      ok: true,
      intent: out.intent,
      latency_ms: out.total_latency_ms,
      response_skipped: out.response_skipped,
    });
  } catch (err) {
    logger.error({ err, update_id: update.update_id }, 'telegram webhook: pipeline error');
    return c.json({ ok: false, error: 'internal error' }, 200);
  }
});

/**
 * Document/photo subroutine. Telegram sends photos as an array of
 * PhotoSize objects (different resolutions); we always pick the largest.
 */
async function handleDocumentMessage(update: TelegramUpdate, c: any) {
  const msg = update.message!;
  const from = msg.from!;

  try {
    const user = await upsertUser({
      telegram_id: String(from.id),
      username: from.username,
      first_name: from.first_name,
      last_name: from.last_name,
      is_bot: from.is_bot,
    });
    const conversation = await upsertConversation({
      user_id: user._id,
      channel: 'telegram',
      chat_id: String(msg.chat.id),
      status: 'active',
    });

    let fileId: string;
    let fileName: string;
    let mimeType: string;

    if (msg.photo && msg.photo.length > 0) {
      // Pick the largest size
      const largest = msg.photo.reduce((a, b) =>
        a.width * a.height > b.width * b.height ? a : b,
      );
      fileId = largest.file_id;
      fileName = `photo-${Date.now()}.jpg`;
      mimeType = 'image/jpeg';
    } else if (msg.document) {
      fileId = msg.document.file_id;
      fileName = msg.document.file_name ?? `document-${Date.now()}`;
      mimeType = msg.document.mime_type ?? 'application/octet-stream';
    } else {
      return c.json({ ok: true });
    }

    // Save the inbound message with type 'photo' or 'document'
    const messageType = msg.photo ? 'photo' : 'document';
    const savedMsg = await saveMessage({
      conversation_id: conversation._id,
      message_id: String(msg.message_id),
      user_id: user._id,
      message_type: messageType,
      direction: 'incoming',
      timestamp: new Date(msg.date * 1000),
      metadata: { telegram_file_id: fileId, file_name: fileName },
    });

    // Download from Telegram
    logger.info({ fileId, fileName, mimeType }, 'downloading document from telegram');
    const tgFile = await getFile(fileId);

    // Run the document flow (validate -> MinIO -> classify -> notify)
    const result = await handleDocument({
      imageBytes: tgFile.bytes,
      mimeType: tgFile.mimeType,
      fileName: tgFile.fileName,
      telegramFileId: fileId,
      conversation_id: conversation._id,
      message_object_id: savedMsg._id,
      user_id: user._id,
      chat_id: msg.chat.id,
    });

    return c.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'document handler error');
    return c.json({ ok: false, error: 'internal error' }, 200);
  }
}
