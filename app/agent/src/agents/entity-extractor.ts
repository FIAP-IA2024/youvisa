import { z } from 'zod';
import { callClaude, extractJSON } from '@/lib/claude';
import { logger } from '@/lib/logger';
import { ENTITY_SYSTEM_PROMPT } from '@/prompts/entity';
import type { Entities } from '@/orchestrator/types';

const entitiesSchema = z
  .object({
    visa_type: z.string().optional(),
    country: z.string().optional(),
    process_id: z.string().optional(),
    doc_type: z.string().optional(),
    email: z.string().email().optional(),
    dates: z.array(z.string()).optional(),
  })
  .strict()
  .partial();

export interface EntityResult {
  entities: Entities;
  raw: string;
  durationMs: number;
  toTrace(): Record<string, unknown>;
}

export async function extractEntities(message: string): Promise<EntityResult> {
  const result = await callClaude({
    systemPrompt: ENTITY_SYSTEM_PROMPT,
    userMessage: `Usuário: "${message}"`,
    maxTokens: 200,
  });

  const parsed = extractJSON<unknown>(result.text);
  const validated = entitiesSchema.safeParse(parsed ?? {});
  const entities: Entities = validated.success ? (validated.data as Entities) : {};

  if (!validated.success) {
    logger.warn(
      { raw: result.text, error: validated.error.issues },
      'entity extractor returned malformed JSON, defaulting to empty',
    );
  }

  return {
    entities,
    raw: result.text,
    durationMs: result.durationMs,
    toTrace() {
      return { entities };
    },
  };
}
