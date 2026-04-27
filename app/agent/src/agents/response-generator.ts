import { callClaude } from '@/lib/claude';
import { buildResponseSystemPrompt, type ResponseContext } from '@/prompts/response';

export interface ResponseResult {
  text: string;
  durationMs: number;
  toTrace(): Record<string, unknown>;
}

export async function generateResponse(
  userMessage: string,
  ctx: ResponseContext,
): Promise<ResponseResult> {
  const systemPrompt = buildResponseSystemPrompt(ctx);
  const result = await callClaude({
    systemPrompt,
    userMessage,
    maxTokens: 500,
  });

  const text = result.text.trim();

  return {
    text,
    durationMs: result.durationMs,
    toTrace() {
      // Don't dump the full response into agent_trace (it's already in
      // interaction_log.response). Just metadata.
      return {
        response_length: text.length,
        first_chars: text.slice(0, 60),
      };
    },
  };
}
