import { inject, injectable } from 'tsyringe';
import winston, { type Logger } from 'winston';

import { EnvConfig } from './env.config';

/**
 * Thin wrapper exposing a typed `winston.Logger` via tsyringe DI.
 *
 * History: a previous revision did
 * `class LoggerConfig extends winston.createLogger {...}` —
 * `winston.createLogger` is a **function**, not a class, so extending
 * it lost the entire `Logger` interface and every `.info` / `.warn` /
 * `.error` call across the API tree was a TypeScript error masked
 * only by `make type-check || true`. We now compose: the class holds
 * a real `Logger` and forwards the methods callers use. The public
 * surface is unchanged so no callsite needs to update.
 */
@injectable()
export class LoggerConfig {
  private readonly logger: Logger;

  constructor(@inject('EnvConfig') env: EnvConfig) {
    this.logger = winston.createLogger({
      level: env.IS_DEBUG ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }

  info(message: string, meta?: Record<string, unknown>): Logger {
    return this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): Logger {
    return this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): Logger {
    return this.logger.error(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): Logger {
    return this.logger.debug(message, meta);
  }
}
