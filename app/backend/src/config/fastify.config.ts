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
      this.logger.error('Request error', {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
      });

      reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Internal Server Error',
      });
    });

    return server;
  }
}
