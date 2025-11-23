import { injectable } from 'tsyringe';

import { IUser, UserModel } from '@/models';

@injectable()
export class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new UserModel(data);
    return await user.save();
  }

  async findById(id: string): Promise<IUser | null> {
    return await UserModel.findById(id);
  }

  async findByTelegramId(telegramId: string): Promise<IUser | null> {
    return await UserModel.findOne({ telegram_id: telegramId });
  }

  async updateById(id: string, data: Partial<IUser>): Promise<IUser | null> {
    return await UserModel.findByIdAndUpdate(id, data, { new: true });
  }

  async upsertByTelegramId(
    telegramId: string,
    data: Partial<IUser>,
  ): Promise<IUser> {
    return await UserModel.findOneAndUpdate(
      { telegram_id: telegramId },
      data,
      { new: true, upsert: true },
    );
  }

  async deleteById(id: string): Promise<IUser | null> {
    return await UserModel.findByIdAndDelete(id);
  }
}
