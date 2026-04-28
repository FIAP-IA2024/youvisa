import {
  query,
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
} from '@anthropic-ai/claude-agent-sdk';
import { getEnv } from '@/config/env';

/**
 * Thin wrapper around `query` that collects the assistant's text output
 * into a single string. All multi-agent pipeline steps use this.
 *
 * Prompt caching: pass `cacheable: true` to opt the system prompt into
 * Claude's ephemeral prompt cache. The SDK splits at
 * `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` — everything before the boundary is
 * eligible for global cross-session caching (5-min TTL). For Sprint 4
 * we only cache the response generator's prompt (the largest one, with
 * few-shot + visa guidance) so consecutive customer messages see ~60%
 * less Claude latency.
 */
export async function callClaude(opts: {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
  imageBase64?: string;
  imageMediaType?: string;
  cacheable?: boolean;
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

  // Build the systemPrompt option. When `cacheable`, send a string[]
  // with the dynamic boundary so the prefix is globally cacheable.
  const systemPromptOption = opts.cacheable
    ? [opts.systemPrompt, SYSTEM_PROMPT_DYNAMIC_BOUNDARY]
    : opts.systemPrompt;

  // The SDK picks a platform-specific Claude binary by autodetect; on
  // Debian-arm64 inside Docker it sometimes picks the *-musl variant
  // which segfaults under glibc. Force the glibc one explicitly when
  // we're on linux-arm64.
  const pathToClaudeCodeExecutable =
    process.platform === 'linux' && process.arch === 'arm64'
      ? '/app/node_modules/@anthropic-ai/claude-agent-sdk-linux-arm64/claude'
      : process.platform === 'linux' && process.arch === 'x64'
      ? '/app/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude'
      : undefined;

  for await (const message of query({
    prompt,
    options: {
      model,
      systemPrompt: systemPromptOption,
      ...(opts.maxTokens ? { maxTurns: 1 } : {}),
      ...(pathToClaudeCodeExecutable ? { pathToClaudeCodeExecutable } : {}),
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
