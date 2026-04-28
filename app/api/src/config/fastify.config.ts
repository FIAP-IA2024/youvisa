import cors from '@fastify/cors';
import fastify, { FastifyInstance } from 'fastify';
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { inject, injectable } from 'tsyringe';

import { EnvConfig } from './env.config';
import { LoggerConfig } from './logger.config';

@injectable()
export class FastifyConfig {
  constructor(
    @inject('EnvConfig') private readonly env: EnvConfig,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  public app(): FastifyInstance {
    const server = fastify({
      logger: false, // Using winston instead
    }).withTypeProvider<ZodTypeProvider>();

    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);

    server.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });

    // Global error handler
    server.setErrorHandler((error, request, reply) => {
      const e = error as Error & { statusCode?: number };
      this.logger.error('Request error', {
        error: e.message,
        stack: e.stack,
        url: request.url,
        method: request.method,
      });

      reply.status(e.statusCode ?? 500).send({
        success: false,
        error: e.message || 'Internal Server Error',
      });
    });

    return server;
  }
}
