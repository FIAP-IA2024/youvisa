import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_bot: boolean;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegram_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: false,
    },
    first_name: {
      type: String,
      required: false,
    },
    last_name: {
      type: String,
      required: false,
    },
    language_code: {
      type: String,
      required: false,
    },
    is_bot: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

export const UserModel = mongoose.model<IUser>('User', userSchema);
