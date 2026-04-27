import { query } from '@anthropic-ai/claude-agent-sdk';
import { getEnv } from '@/config/env';

/**
 * Thin wrapper around `query` that collects the assistant's text output
 * into a single string. All multi-agent pipeline steps use this.
 */
export async function callClaude(opts: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<{ text: string; durationMs: number; costUsd: number }> {
  const env = getEnv();
  const model = opts.model ?? env.CLAUDE_MODEL;

  // Build prompt: text-only or multimodal (image + text)
  let prompt: any;
  if (opts.imageBase64 && opts.imageMediaType) {
    prompt = {
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: opts.imageMediaType,
            data: opts.imageBase64,
          },
        },
        { type: 'text', text: opts.userMessage },
      ],
    };
  } else {
    prompt = opts.userMessage;
  }

  let text = '';
  let durationMs = 0;
  let costUsd = 0;

  for await (const message of query({
    prompt,
    options: {
      model,
      systemPrompt: opts.systemPrompt,
      ...(opts.maxTokens ? { maxTurns: 1 } : {}),
    },
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') text += block.text;
      }
    } else if (message.type === 'result') {
      durationMs = (message as any).duration_ms ?? 0;
      costUsd = (message as any).total_cost_usd ?? 0;
    }
  }

  return { text, durationMs, costUsd };
}

/**
 * Try to parse the LLM's response as JSON.
 * Tolerant: extracts the first {...} block if there's surrounding prose.
 */
export function extractJSON<T = unknown>(raw: string): T | null {
  // First try direct parse
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    // Fall through to extraction
  }
  // Extract outermost {...}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  // Brace-match to find the right closing brace
  let depth = 0;
  let realEnd = -1;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        realEnd = i + 1;
        break;
      }
    }
  }
  if (realEnd === -1) return null;
  try {
    return JSON.parse(raw.slice(start, realEnd)) as T;
  } catch {
    return null;
  }
}
