import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  user_id: mongoose.Types.ObjectId;
  channel: 'telegram' | 'whatsapp' | 'webchat';
  chat_id: string;
  status: 'active' | 'transferred' | 'resolved' | 'closed';
  started_at: Date;
  last_message_at?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['telegram', 'whatsapp', 'webchat'],
      required: true,
    },
    chat_id: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'transferred', 'resolved', 'closed'],
      default: 'active',
      index: true,
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    last_message_at: {
      type: Date,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

// Unique index for user_id + channel + chat_id combination
conversationSchema.index({ user_id: 1, channel: 1, chat_id: 1 }, { unique: true });

export const ConversationModel = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema,
);
