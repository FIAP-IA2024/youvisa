import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation_id: mongoose.Types.ObjectId;
  message_id: string;
  user_id: mongoose.Types.ObjectId;
  text?: string;
  message_type: 'text' | 'document' | 'photo' | 'video' | 'audio';
  direction: 'incoming' | 'outgoing';
  timestamp: Date;
  metadata: Record<string, any>;
  created_at: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    message_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: false,
    },
    message_type: {
      type: String,
      enum: ['text', 'document', 'photo', 'video', 'audio'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  },
);

export const MessageModel = mongoose.model<IMessage>('Message', messageSchema);
