import { inject, injectable } from 'tsyringe';
import winston from 'winston';

import { EnvConfig } from './env.config';

@injectable()
export class LoggerConfig extends winston.createLogger {
  constructor(@inject('EnvConfig') env: EnvConfig) {
    super({
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
}
