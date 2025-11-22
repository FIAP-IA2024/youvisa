import 'reflect-metadata';

import { container } from 'tsyringe';

import {
  DatabaseConfig,
  EnvConfig,
  FastifyConfig,
  LoggerConfig,
} from './config';
import {
  ConversationController,
  FileController,
  MessageController,
  UserController,
} from './controllers';
import {
  ConversationRepository,
  FileRepository,
  MessageRepository,
  UserRepository,
} from './repositories';

// Register all dependencies
container.register('EnvConfig', { useClass: EnvConfig });
container.register('LoggerConfig', { useClass: LoggerConfig });
container.register('DatabaseConfig', { useClass: DatabaseConfig });
container.register('FastifyConfig', { useClass: FastifyConfig });

// Register repositories
container.register('UserRepository', { useClass: UserRepository });
container.register('ConversationRepository', {
  useClass: ConversationRepository,
});
container.register('MessageRepository', { useClass: MessageRepository });
container.register('FileRepository', { useClass: FileRepository });

// Register controllers
container.register('UserController', { useClass: UserController });
container.register('ConversationController', {
  useClass: ConversationController,
});
container.register('MessageController', { useClass: MessageController });
container.register('FileController', { useClass: FileController });

export { container };
