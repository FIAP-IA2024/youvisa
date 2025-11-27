import { FastifyInstance } from 'fastify';

import {
  ConversationController,
  FileController,
  MessageController,
  UserController,
} from './controllers';
import { container } from './container';

export async function routes(fastify: FastifyInstance) {
  const userController = container.resolve(UserController);
  const conversationController = container.resolve(ConversationController);
  const messageController = container.resolve(MessageController);
  const fileController = container.resolve(FileController);

  // Health check
  fastify.get('/health', async () => {
    return { success: true, status: 'healthy' };
  });

  // User routes
  fastify.post('/users', async (request, reply) => {
    const result = await userController.create(request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/users', async (request, reply) => {
    const result = await userController.getAll();
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await userController.getById(id);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.put('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await userController.updateById(id, request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.post('/users/upsert/:telegramId', async (request, reply) => {
    const { telegramId } = request.params as { telegramId: string };
    const result = await userController.upsertByTelegramId(
      telegramId,
      request.body as any,
    );
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await userController.deleteById(id);
    return reply.status(result.statusCode).send(result.body);
  });

  // Conversation routes
  fastify.post('/conversations', async (request, reply) => {
    const result = await conversationController.create(request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await conversationController.getById(id);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/conversations', async (request, reply) => {
    const { status, channel } = request.query as any;
    const result = await conversationController.getAll({ status, channel });
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.put('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await conversationController.updateById(
      id,
      request.body as any,
    );
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.post('/conversations/upsert', async (request, reply) => {
    const { user_id, channel, chat_id, ...data } = request.body as any;
    const result = await conversationController.upsert(
      user_id,
      channel,
      chat_id,
      data,
    );
    return reply.status(result.statusCode).send(result.body);
  });

  // Message routes
  fastify.post('/messages', async (request, reply) => {
    const result = await messageController.create(request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/messages/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await messageController.getById(id);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/messages', async (request, reply) => {
    const { conversation_id, message_type } = request.query as any;
    const result = await messageController.getAll({
      conversation_id,
      message_type,
    });
    return reply.status(result.statusCode).send(result.body);
  });

  // File routes
  fastify.post('/files', async (request, reply) => {
    const result = await fileController.create(request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/files/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await fileController.getById(id);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/files', async (request, reply) => {
    const { conversation_id } = request.query as any;
    const result = await fileController.getAll({ conversation_id });
    return reply.status(result.statusCode).send(result.body);
  });
}
