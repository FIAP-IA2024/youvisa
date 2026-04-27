import { Hono } from 'hono';
import { runPipeline } from '@/orchestrator/pipeline';
import {
  saveMessage,
  upsertConversation,
  upsertUser,
} from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/telegram/client';
import { updateSchema, type TelegramUpdate } from '@/telegram/types';

export const telegramWebhookRoute = new Hono();

/**
 * POST /telegram/webhook
 * Receives Telegram bot updates. Telegram pushes here when the user
 * sends a message; we run the multi-agent pipeline and respond via
 * Telegram sendMessage.
 *
 * NOTE: Telegram requires this endpoint to respond within ~60s. The
 * pipeline can take 10-15s with LLM calls, which is fine. For longer
 * processing (e.g., document classification with vision) Phase 6 will
 * fork into a non-blocking handler.
 */
telegramWebhookRoute.post('/telegram/webhook', async (c) => {
  let update: TelegramUpdate;
  try {
    const body = await c.req.json();
    update = updateSchema.parse(body);
  } catch (err) {
    logger.warn({ err }, 'telegram webhook: invalid payload');
    // Return 200 so Telegram doesn't keep retrying the same bad update
    return c.json({ ok: false, error: 'invalid payload' }, 200);
  }

  const msg = update.message;
  if (!msg || !msg.from) {
    logger.debug({ update_id: update.update_id }, 'telegram webhook: no message in update');
    return c.json({ ok: true });
  }

  // Documents/photos handled in Phase 6
  if (msg.photo || msg.document) {
    logger.info({ update_id: update.update_id }, 'document received (Phase 6 handler not yet wired)');
    // Acknowledge silently for now; Phase 6 will plug in the classifier flow.
    return c.json({ ok: true });
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
