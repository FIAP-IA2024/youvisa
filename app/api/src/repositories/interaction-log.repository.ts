import { injectable } from 'tsyringe';

import { IInteractionLog, InteractionLogModel } from '@/models';

@injectable()
export class InteractionLogRepository {
  async create(data: Partial<IInteractionLog>): Promise<IInteractionLog> {
    const log = new InteractionLogModel(data);
    return await log.save();
  }

  async findById(id: string): Promise<IInteractionLog | null> {
    return await InteractionLogModel.findById(id);
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<IInteractionLog[]> {
    return await InteractionLogModel.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit);
  }

  async findByConversationId(
    conversationId: string,
    limit: number = 100,
  ): Promise<IInteractionLog[]> {
    return await InteractionLogModel.find({ conversation_id: conversationId })
      .sort({ created_at: 1 })
      .limit(limit);
  }

  async findAll(
    filters?: { intent?: string; user_id?: string; channel?: string },
    limit: number = 100,
  ): Promise<IInteractionLog[]> {
    const query: Record<string, unknown> = {};
    if (filters?.intent) query.intent = filters.intent;
    if (filters?.user_id) query.user_id = filters.user_id;
    if (filters?.channel) query.channel = filters.channel;

    return await InteractionLogModel.find(query)
      .sort({ created_at: -1 })
      .limit(limit);
  }
}
