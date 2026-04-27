import mongoose from 'mongoose';
import { signPortalJWT } from '@/auth/jwt';
import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';
import { inputFilter, REFUSAL_MESSAGE } from '@/agents/input-filter';
import { classifyIntent } from '@/agents/intent-classifier';
import { extractEntities } from '@/agents/entity-extractor';
import { lookup } from '@/agents/lookup';
import { generateResponse } from '@/agents/response-generator';
import { outputFilter, FALLBACK_MESSAGE } from '@/agents/output-filter';
import {
  ConversationModel,
  findUserByTelegramId,
  UserModel,
} from '@/db/repositories';
import { Tracer } from './tracer';
import type { PipelineInput, PipelineOutput } from './types';

const env = getEnv();

/**
 * Persists an InteractionLog to the API. Best-effort: failure to log
 * does not fail the response (the user already has their answer).
 */
async function persistInteractionLog(
  input: PipelineInput,
  output: PipelineOutput,
): Promise<void> {
  try {
    const res = await fetch(`${env.API_URL}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.API_KEY,
      },
      body: JSON.stringify({
        session_id: input.conversation_id,
        user_id: input.user_id,
        conversation_id: input.conversation_id,
        channel: 'telegram',
        user_message: input.user_message,
        intent: output.intent,
        intent_confidence: output.intent_confidence,
        entities: output.entities,
        agent_trace: output.agent_trace,
        response: output.response,
        response_skipped: output.response_skipped,
        total_latency_ms: output.total_latency_ms,
      }),
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, body: await res.text() },
        'failed to persist interaction log',
      );
    }
  } catch (err) {
    logger.warn({ err }, 'persistInteractionLog error');
  }
}

/**
 * Run the multi-agent pipeline against an inbound user message.
 *
 * Order matters:
 *  1. Handoff short-circuit (BEFORE any LLM)
 *  2. Input Filter (BEFORE any LLM)
 *  3. Intent Classifier
 *  4. Entity Extractor
 *  5. Lookup
 *  6. Response Generator
 *  7. Output Filter
 *  8. Persist InteractionLog
 *
 * Each step is wrapped by the Tracer for audit and demo visibility.
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const tracer = new Tracer();
  const t0 = performance.now();

  // ---- 0. Handoff short-circuit ----
  // If conversation.status === 'transferred', the bot stays silent until
  // an operator returns it to 'active'. This MUST happen before any LLM call.
  const conv = await ConversationModel().findById(input.conversation_id).lean();
  if (conv?.status === 'transferred') {
    tracer.push({
      step: 'handoff-check',
      started_at: new Date(),
      duration_ms: Math.round(performance.now() - t0),
      output: { transferred: true, skipped_pipeline: true },
    });
    const output: PipelineOutput = {
      response: '',
      response_skipped: true,
      intent: 'transferred',
      intent_confidence: 1,
      entities: {},
      agent_trace: tracer.trace(),
      total_latency_ms: Math.round(performance.now() - t0),
    };
    await persistInteractionLog(input, output);
    return output;
  }

  // ---- 1. Input Filter (deterministic) ----
  const filterResult = await tracer.run('input-filter', async () =>
    inputFilter(input.user_message),
  );

  if (filterResult.blocked) {
    const output: PipelineOutput = {
      response: REFUSAL_MESSAGE,
      response_skipped: false,
      intent: 'injection_attempt',
      intent_confidence: 1,
      entities: {},
      agent_trace: tracer.trace(),
      total_latency_ms: Math.round(performance.now() - t0),
    };
    await persistInteractionLog(input, output);
    return output;
  }

  // ---- 2 & 3. Intent + Entity (parallel — they don't depend on each other) ----
  const [intentResult, entityResult] = await Promise.all([
    tracer.run('intent-classifier', () => classifyIntent(input.user_message)),
    tracer.run('entity-extractor', () => extractEntities(input.user_message)),
  ]);

  // ---- 4. Lookup (deterministic) ----
  const lookupResult = await tracer.run('lookup', () =>
    lookup(intentResult.intent, entityResult.entities, input.user_id),
  );

  // ---- 4.5. Special handling for portal request — short-circuit response ----
  if (intentResult.intent === 'open_portal') {
    const portalToken = await signPortalJWT(
      { user_id: input.user_id },
      env.PORTAL_SECRET,
      env.PORTAL_TTL_HOURS * 60,
    );
    const portalUrl = `${env.PORTAL_BASE_URL}/portal/${portalToken}`;

    tracer.push({
      step: 'portal-token-generator',
      started_at: new Date(),
      duration_ms: 1,
      output: { url_issued: true, ttl_hours: env.PORTAL_TTL_HOURS },
    });

    const responseText = `Aqui está o link do seu portal pessoal:\n\n${portalUrl}\n\nLá você pode ver o status do seu processo, o histórico de interações e os documentos enviados.`;
    const output: PipelineOutput = {
      response: responseText,
      response_skipped: false,
      intent: 'open_portal',
      intent_confidence: intentResult.confidence,
      entities: entityResult.entities,
      agent_trace: tracer.trace(),
      total_latency_ms: Math.round(performance.now() - t0),
      portal_url: portalUrl,
    };
    await persistInteractionLog(input, output);
    return output;
  }

  // ---- 5. Build context for Response Generator ----
  const user = await UserModel().findById(input.user_id).lean();

  const conversationState =
    (conv?.metadata as Record<string, unknown>)?.state as string | undefined;

  // ---- 6. Response Generator ----
  const responseResult = await tracer.run('response-generator', () =>
    generateResponse(input.user_message, {
      intent: intentResult.intent,
      entities: entityResult.entities,
      processes: lookupResult.processes,
      documents: lookupResult.documents,
      has_email: Boolean(user?.email),
      state: conversationState ?? 'PRONTO',
    }),
  );

  // ---- 7. Output Filter ----
  const outputCheck = await tracer.run('output-filter', async () =>
    outputFilter(responseResult.text),
  );
  const finalText = outputCheck.allowed ? responseResult.text : FALLBACK_MESSAGE;

  // ---- 8. Side-effects: handoff trigger + email persist ----
  if (intentResult.intent === 'want_human' && conv) {
    await ConversationModel().findByIdAndUpdate(conv._id, { status: 'transferred' });
    tracer.push({
      step: 'handoff-trigger',
      started_at: new Date(),
      duration_ms: 1,
      output: { conversation_id: String(conv._id), new_status: 'transferred' },
    });
  }

  if (intentResult.intent === 'provide_email' && entityResult.entities.email && user) {
    await UserModel().findByIdAndUpdate(user._id, {
      email: entityResult.entities.email,
      email_updated_at: new Date(),
    });
    tracer.push({
      step: 'email-persist',
      started_at: new Date(),
      duration_ms: 1,
      output: { user_id: String(user._id), email_set: true },
    });
  }

  const output: PipelineOutput = {
    response: finalText,
    response_skipped: false,
    intent: intentResult.intent,
    intent_confidence: intentResult.confidence,
    entities: entityResult.entities,
    agent_trace: tracer.trace(),
    total_latency_ms: Math.round(performance.now() - t0),
  };
  await persistInteractionLog(input, output);
  return output;
}
