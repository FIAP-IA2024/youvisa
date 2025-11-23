import { injectable } from 'tsyringe';

import { FileModel, IFile } from '@/models';

@injectable()
export class FileRepository {
  async create(data: Partial<IFile>): Promise<IFile> {
    const file = new FileModel(data);
    return await file.save();
  }

  async findById(id: string): Promise<IFile | null> {
    return await FileModel.findById(id);
  }

  async findByConversation(conversationId: string): Promise<IFile[]> {
    return await FileModel.find({ conversation_id: conversationId }).sort({
      uploaded_at: -1,
    });
  }

  async findByMessage(messageId: string): Promise<IFile | null> {
    return await FileModel.findOne({ message_id: messageId });
  }

  async findAll(filters?: { conversation_id?: string }): Promise<IFile[]> {
    const query = filters || {};
    return await FileModel.find(query).sort({ uploaded_at: -1 });
  }

  async deleteById(id: string): Promise<IFile | null> {
    return await FileModel.findByIdAndDelete(id);
  }
}
