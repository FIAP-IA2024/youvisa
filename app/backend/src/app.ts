import 'reflect-metadata';

import {
  DatabaseConfig,
  EnvConfig,
  FastifyConfig,
  LoggerConfig,
} from './config';
import { container } from './container';
import { routes } from './routes';

export const app = () => {
  const fastify = container.resolve(FastifyConfig).app();
  const logger = container.resolve(LoggerConfig);
  const env = container.resolve(EnvConfig);
  const database = container.resolve(DatabaseConfig);

  // Connect to database before registering routes
  fastify.addHook('onRequest', async () => {
    await database.connect();
  });

  // API Key authentication (except /health)
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') {
      return;
    }

    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== env.API_KEY) {
      reply.code(401).send({ error: 'Unauthorized: Invalid or missing API key' });
      return;
    }
  });

  fastify.register(routes);

  return { fastify, env, logger, database };
};
