import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { getEnv } from '@/config/env';
import { connectMongo } from '@/db/mongo';
import { logger } from '@/lib/logger';
import { cors } from 'hono/cors';
import { healthRoute } from '@/routes/health';
import { knowledgeRoute } from '@/routes/knowledge';
import { telegramWebhookRoute } from '@/routes/telegram-webhook';

const env = getEnv();

// Connect to Mongo at startup. Fail fast if the DB is unreachable —
// the pipeline cannot work without it.
await connectMongo().catch((err) => {
  logger.fatal({ err }, 'mongo connection failed at startup');
  process.exit(1);
});

const app = new Hono();

// Allow the frontend (default :3000) to fetch /knowledge for the portal.
app.use('/knowledge/*', cors({ origin: '*' }));

// Health route (always available, no auth)
app.route('/', healthRoute);
app.route('/', telegramWebhookRoute);
app.route('/', knowledgeRoute);

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: 'route not found' }, 404),
);

// Error handler
app.onError((err, c) => {
  logger.error({ err }, 'unhandled error');
  return c.json(
    { success: false, error: err.message || 'internal server error' },
    500,
  );
});

serve(
  {
    fetch: app.fetch,
    port: env.AGENT_PORT,
  },
  (info) => {
    logger.info(
      { port: info.port, env: env.NODE_ENV, model: env.CLAUDE_MODEL },
      'agent service listening',
    );
  },
);
