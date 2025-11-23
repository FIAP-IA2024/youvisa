import { injectable } from 'tsyringe';

import { IMessage, MessageModel } from '@/models';

@injectable()
export class MessageRepository {
  async create(data: Partial<IMessage>): Promise<IMessage> {
    const message = new MessageModel(data);
    return await message.save();
  }

  async findById(id: string): Promise<IMessage | null> {
    return await MessageModel.findById(id);
  }

  async findByConversation(
    conversationId: string,
    limit = 100,
  ): Promise<IMessage[]> {
    return await MessageModel.find({ conversation_id: conversationId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async findAll(filters?: {
    conversation_id?: string;
    message_type?: string;
  }): Promise<IMessage[]> {
    const query = filters || {};
    return await MessageModel.find(query).sort({ timestamp: -1 });
  }

  async deleteById(id: string): Promise<IMessage | null> {
    return await MessageModel.findByIdAndDelete(id);
  }
}
