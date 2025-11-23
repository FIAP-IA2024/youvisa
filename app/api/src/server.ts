import { app } from './app';

const { fastify, env, logger } = app();

fastify
  .listen({ port: env.API_PORT, host: env.API_HOST })
  .then(() =>
    logger.info(`Server running on http://${env.API_HOST}:${env.API_PORT}`, {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
  )
  .catch((error) => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
