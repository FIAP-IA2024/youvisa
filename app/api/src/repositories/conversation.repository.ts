import { injectable } from 'tsyringe';

import { ConversationModel, IConversation } from '@/models';

@injectable()
export class ConversationRepository {
  async create(data: Partial<IConversation>): Promise<IConversation> {
    const conversation = new ConversationModel(data);
    return await conversation.save();
  }

  async findById(id: string): Promise<IConversation | null> {
    return await ConversationModel.findById(id);
  }

  async findByUserAndChannel(
    userId: string,
    channel: string,
    chatId: string,
  ): Promise<IConversation | null> {
    return await ConversationModel.findOne({
      user_id: userId,
      channel,
      chat_id: chatId,
    });
  }

  async findAllByUser(userId: string): Promise<IConversation[]> {
    return await ConversationModel.find({ user_id: userId }).sort({
      last_message_at: -1,
    });
  }

  async findAll(filters?: {
    status?: string;
    channel?: string;
  }): Promise<IConversation[]> {
    const query = Object.fromEntries(
      Object.entries(filters || {}).filter(([, v]) => v),
    );
    return Object.keys(query).length
      ? await ConversationModel.find(query).sort({ last_message_at: -1 })
      : await ConversationModel.find().sort({ last_message_at: -1 });
  }

  async updateById(
    id: string,
    data: Partial<IConversation>,
  ): Promise<IConversation | null> {
    return await ConversationModel.findByIdAndUpdate(id, data, { new: true });
  }

  async upsertByUserAndChannel(
    userId: string,
    channel: string,
    chatId: string,
    data: Partial<IConversation>,
  ): Promise<IConversation> {
    return await ConversationModel.findOneAndUpdate(
      { user_id: userId, channel, chat_id: chatId },
      data,
      { new: true, upsert: true },
    );
  }

  async deleteById(id: string): Promise<IConversation | null> {
    return await ConversationModel.findByIdAndDelete(id);
  }
}
