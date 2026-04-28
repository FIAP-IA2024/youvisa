import { Hono } from 'hono';
import { z } from 'zod';
import { runPipeline } from '@/orchestrator/pipeline';
import {
  saveMessage,
  upsertConversation,
  upsertUser,
} from '@/lib/api-client';
import { logger } from '@/lib/logger';

/**
 * Demo-only routes. Exposed on the agent service so a Telegram-style
 * simulator (Sprint 4 video deliverable) can drive the real multi-agent
 * pipeline and receive the response inline — without going through the
 * actual Telegram Bot API.
 *
 * Not used in production. Kept under /demo/* prefix and CORS-open.
 */
export const demoRoute = new Hono();

const sendSchema = z.object({
  text: z.string().min(1).max(2000),
  chat_id: z.string(),
  telegram_id: z.string(),
  first_name: z.string().optional(),
});

demoRoute.post('/demo/send', async (c) => {
  const parsed = sendSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }
  const { text, chat_id, telegram_id, first_name } = parsed.data;

  try {
    const user = await upsertUser({
      telegram_id,
      first_name: first_name ?? 'Demo',
      is_bot: false,
    });
    const conversation = await upsertConversation({
      user_id: user._id,
      channel: 'telegram',
      chat_id,
      status: 'active',
    });
    await saveMessage({
      conversation_id: conversation._id,
      message_id: `demo-${Date.now()}`,
      user_id: user._id,
      text,
      message_type: 'text',
      direction: 'incoming',
    });

    const out = await runPipeline({
      user_id: user._id,
      conversation_id: conversation._id,
      chat_id,
      user_message: text,
    });

    // Save the bot's outbound message for the operator console (when not skipped)
    if (!out.response_skipped && out.response) {
      await saveMessage({
        conversation_id: conversation._id,
        message_id: `bot-demo-${Date.now()}`,
        user_id: user._id,
        text: out.response,
        message_type: 'text',
        direction: 'outgoing',
        metadata: { intent: out.intent, demo: true },
      });
    }

    return c.json({
      ok: true,
      intent: out.intent,
      intent_confidence: out.intent_confidence,
      entities: out.entities,
      response: out.response,
      response_skipped: out.response_skipped,
      agent_trace: out.agent_trace,
      total_latency_ms: out.total_latency_ms,
      portal_url: out.portal_url ?? null,
      conversation_id: conversation._id,
      user_id: user._id,
    });
  } catch (err) {
    logger.error({ err }, '/demo/send error');
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

const handoffResetSchema = z.object({
  conversation_id: z.string(),
});

/**
 * Demo helper: flip the conversation back to `active` (used during the
 * recording when we show "operator returns conversation to bot").
 */
demoRoute.post('/demo/return-to-bot', async (c) => {
  const parsed = handoffResetSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.issues }, 400);
  }
  try {
    const { ConversationModel } = await import('@/db/repositories');
    const result = await ConversationModel().findByIdAndUpdate(
      parsed.data.conversation_id,
      { status: 'active' },
      { new: true },
    );
    return c.json({ ok: true, conversation: result });
  } catch (err) {
    logger.error({ err }, '/demo/return-to-bot error');
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});
