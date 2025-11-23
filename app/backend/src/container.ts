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

// Register @/config
container.registerSingleton('EnvConfig', EnvConfig);
container.registerSingleton('LoggerConfig', LoggerConfig);
container.registerSingleton('DatabaseConfig', DatabaseConfig);
container.registerSingleton('FastifyConfig', FastifyConfig);

// Register @/repositories
container.registerSingleton('UserRepository', UserRepository);
container.registerSingleton('ConversationRepository', ConversationRepository);
container.registerSingleton('MessageRepository', MessageRepository);
container.registerSingleton('FileRepository', FileRepository);

// Register @/controllers
container.registerSingleton('UserController', UserController);
container.registerSingleton('ConversationController', ConversationController);
container.registerSingleton('MessageController', MessageController);
container.registerSingleton('FileController', FileController);

export { container };
