import { injectable } from 'tsyringe';

import {
  IProcess,
  ProcessModel,
  VALID_TRANSITIONS,
  UserModel,
} from '@/models';

@injectable()
export class ProcessRepository {
  async create(data: Partial<IProcess>): Promise<IProcess> {
    const process = new ProcessModel(data);
    return await process.save();
  }

  async findById(id: string): Promise<IProcess | null> {
    return await ProcessModel.findById(id).populate('documents');
  }

  async findByUserId(userId: string): Promise<IProcess[]> {
    return await ProcessModel.find({ user_id: userId })
      .sort({ created_at: -1 })
      .populate('documents');
  }

  async findByTelegramId(telegramId: string): Promise<IProcess[]> {
    const user = await UserModel.findOne({ telegram_id: telegramId });
    if (!user) return [];
    return await ProcessModel.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .populate('documents');
  }

  async findAll(filters?: {
    status?: string;
    user_id?: string;
    visa_type?: string;
  }): Promise<IProcess[]> {
    const query: Record<string, any> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.user_id) query.user_id = filters.user_id;
    if (filters?.visa_type) query.visa_type = filters.visa_type;

    return await ProcessModel.find(query)
      .sort({ created_at: -1 })
      .populate('documents');
  }

  async updateStatus(
    id: string,
    newStatus: string,
    reason: string,
    changedBy: string = 'system',
  ): Promise<{ process: IProcess | null; error?: string }> {
    const process = await ProcessModel.findById(id);
    if (!process) return { process: null, error: 'Process not found' };

    const currentStatus = process.status;
    const validNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (!validNextStatuses.includes(newStatus)) {
      return {
        process: null,
        error: `Invalid transition from '${currentStatus}' to '${newStatus}'. Valid transitions: ${validNextStatuses.join(', ') || 'none (final state)'}`,
      };
    }

    const updated = await ProcessModel.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        $push: {
          status_history: {
            from_status: currentStatus,
            to_status: newStatus,
            reason,
            changed_by: changedBy,
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );

    return { process: updated };
  }

  async addDocument(
    processId: string,
    fileId: string,
  ): Promise<IProcess | null> {
    return await ProcessModel.findByIdAndUpdate(
      processId,
      { $addToSet: { documents: fileId } },
      { new: true },
    ).populate('documents');
  }

  async getStatusHistory(id: string): Promise<IProcess | null> {
    return await ProcessModel.findById(id).select('status_history status');
  }
}
