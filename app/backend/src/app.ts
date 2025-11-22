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

  fastify.register(routes);

  return { fastify, env, logger, database };
};
