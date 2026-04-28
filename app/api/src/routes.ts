import { FastifyInstance } from 'fastify';

import {
  ConversationController,
  FileController,
  InteractionLogController,
  MessageController,
  ProcessController,
  UserController,
} from './controllers';
import { container } from './container';

export async function routes(fastify: FastifyInstance) {
  const userController = container.resolve(UserController);
  const conversationController = container.resolve(ConversationController);
  const messageController = container.resolve(MessageController);
  const fileController = container.resolve(FileController);
  const processController = container.resolve(ProcessController);
  const interactionLogController = container.resolve(InteractionLogController);

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
    const { status, channel, user_id } = request.query as any;
    const result = await conversationController.getAll({
      status,
      channel,
      user_id,
    });
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

  // Process routes (fixed paths before parameterized paths)
  fastify.post('/processes', async (request, reply) => {
    const result = await processController.create(request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/processes', async (request, reply) => {
    const { status, user_id, visa_type } = request.query as any;
    const result = await processController.getAll({
      status,
      user_id,
      visa_type,
    });
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/processes/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await processController.getByUserId(userId);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/processes/telegram/:telegramId', async (request, reply) => {
    const { telegramId } = request.params as { telegramId: string };
    const result = await processController.getByTelegramId(telegramId);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/processes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await processController.getById(id);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/processes/:id/history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await processController.getStatusHistory(id);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.post('/processes/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await processController.updateStatus(
      id,
      request.body as any,
    );
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.post('/processes/:id/documents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await processController.addDocument(
      id,
      request.body as any,
    );
    return reply.status(result.statusCode).send(result.body);
  });

  // Interaction log routes (written by app/agent at end of every pipeline run;
  // read by the operator console and the customer portal)
  fastify.post('/interactions', async (request, reply) => {
    const result = await interactionLogController.create(request.body as any);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/interactions', async (request, reply) => {
    const { intent, user_id, channel } = request.query as any;
    const result = await interactionLogController.getAll({
      intent,
      user_id,
      channel,
    });
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get('/interactions/user/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const result = await interactionLogController.getByUserId(userId);
    return reply.status(result.statusCode).send(result.body);
  });

  fastify.get(
    '/interactions/conversation/:conversationId',
    async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const result = await interactionLogController.getByConversationId(
        conversationId,
      );
      return reply.status(result.statusCode).send(result.body);
    },
  );

  fastify.get('/interactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await interactionLogController.getById(id);
    return reply.status(result.statusCode).send(result.body);
  });
}
