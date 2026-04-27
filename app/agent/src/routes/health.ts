import { Hono } from 'hono';

export const healthRoute = new Hono();

healthRoute.get('/health', (c) =>
  c.json({
    success: true,
    status: 'healthy',
    service: 'agent',
    timestamp: new Date().toISOString(),
  }),
);
