/**
 * One-off smoke script to verify the Claude Agent SDK can authenticate
 * and answer a basic question. Useful when first setting up or debugging
 * auth (run `claude setup-token` first if this fails).
 *
 * Usage: docker exec youvisa-agent npx tsx src/scripts/test-claude.ts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  console.log('Calling Claude with prompt: "diga olá em uma frase"');
  let collected = '';
  for await (const message of query({
    prompt: 'diga olá em uma frase',
    options: {
      model: 'claude-haiku-4-5',
      systemPrompt: 'Responda em português, breve.',
    },
  })) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) {
        if (block.type === 'text') collected += block.text;
      }
    }
    if (message.type === 'result') {
      console.log('---');
      console.log('Result type:', message.subtype);
      if (message.subtype === 'success') {
        console.log('Total cost USD:', message.total_cost_usd);
        console.log('Duration ms:', message.duration_ms);
      }
    }
  }
  console.log('---');
  console.log('Response:', collected);
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
