import { z } from 'zod';
import { callClaude, extractJSON } from '@/lib/claude';
import { logger } from '@/lib/logger';
import { INTENT_INTENTS, INTENT_SYSTEM_PROMPT } from '@/prompts/intent';
import type { Intent } from '@/orchestrator/types';

const intentResultSchema = z.object({
  intent: z.enum(INTENT_INTENTS),
  confidence: z.number().min(0).max(1),
});

export interface IntentResult {
  intent: Intent;
  confidence: number;
  raw: string;
  durationMs: number;
  toTrace(): Record<string, unknown>;
}

export async function classifyIntent(message: string): Promise<IntentResult> {
  const result = await callClaude({
    systemPrompt: INTENT_SYSTEM_PROMPT,
    userMessage: `Usuário: "${message}"`,
    maxTokens: 100,
  });

  const parsed = extractJSON<unknown>(result.text);
  const validated = intentResultSchema.safeParse(parsed);

  if (!validated.success) {
    logger.warn(
      { raw: result.text, error: validated.error.issues },
      'intent classifier returned malformed JSON, defaulting to general',
    );
    return makeResult('general', 0, result.text, result.durationMs);
  }

  return makeResult(
    validated.data.intent,
    validated.data.confidence,
    result.text,
    result.durationMs,
  );
}

function makeResult(
  intent: Intent,
  confidence: number,
  raw: string,
  durationMs: number,
): IntentResult {
  return {
    intent,
    confidence,
    raw,
    durationMs,
    toTrace() {
      return { intent, confidence };
    },
  };
}
