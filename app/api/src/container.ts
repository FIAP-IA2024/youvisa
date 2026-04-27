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
  InteractionLogController,
  MessageController,
  ProcessController,
  UserController,
} from './controllers';
import {
  ConversationRepository,
  FileRepository,
  InteractionLogRepository,
  MessageRepository,
  ProcessRepository,
  UserRepository,
} from './repositories';
import { StatusNotifierService } from './services/status-notifier.service';
import { TelegramNotifier } from './services/telegram-notifier';

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
container.registerSingleton('ProcessRepository', ProcessRepository);
container.registerSingleton('InteractionLogRepository', InteractionLogRepository);

// Register @/services
container.registerSingleton('TelegramNotifier', TelegramNotifier);
container.registerSingleton('StatusNotifierService', StatusNotifierService);

// Register @/controllers
container.registerSingleton('UserController', UserController);
container.registerSingleton('ConversationController', ConversationController);
container.registerSingleton('MessageController', MessageController);
container.registerSingleton('FileController', FileController);
container.registerSingleton('ProcessController', ProcessController);
container.registerSingleton('InteractionLogController', InteractionLogController);

export { container };
