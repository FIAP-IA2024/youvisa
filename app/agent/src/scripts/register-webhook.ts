/**
 * Register the agent's Telegram webhook with the Telegram Bot API.
 *
 * Usage (inside or outside the agent container):
 *   npx tsx src/scripts/register-webhook.ts <public_url>
 *
 * <public_url> must be the publicly-reachable URL that ends at the
 * agent's /telegram/webhook route. In local dev this is typically an
 * ngrok URL (e.g., https://abc123.ngrok-free.app/telegram/webhook).
 *
 * The script also prints the current webhook info so you can verify
 * the change.
 */

import { deleteWebhook, setWebhook } from '@/telegram/client';
import { getEnv } from '@/config/env';

async function main() {
  const env = getEnv();
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: tsx src/scripts/register-webhook.ts <public_url>');
    console.error('       e.g.: tsx src/scripts/register-webhook.ts https://abc123.ngrok-free.app/telegram/webhook');
    console.error('       to delete: tsx src/scripts/register-webhook.ts --delete');
    process.exit(1);
  }

  if (url === '--delete') {
    const ok = await deleteWebhook();
    console.log(ok ? '✓ webhook deleted' : '✗ delete failed');
    process.exit(ok ? 0 : 1);
  }

  console.log(`Setting webhook to: ${url}`);
  const result = await setWebhook(url);
  if (!result.ok) {
    console.error('✗ setWebhook failed:', result.description);
    process.exit(1);
  }
  console.log('✓ webhook registered');

  // Verify
  const infoRes = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
  );
  const info = await infoRes.json();
  console.log('current webhook info:', JSON.stringify(info.result, null, 2));
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
