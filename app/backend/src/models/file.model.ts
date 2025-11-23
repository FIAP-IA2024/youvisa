import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  conversation_id: mongoose.Types.ObjectId;
  message_id: mongoose.Types.ObjectId;
  file_id: string;
  s3_bucket: string;
  s3_key: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: Date;
  metadata: Record<string, any>;
  created_at: Date;
}

const fileSchema = new Schema<IFile>(
  {
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    message_id: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
    },
    file_id: {
      type: String,
      required: true,
      index: true,
    },
    s3_bucket: {
      type: String,
      required: true,
    },
    s3_key: {
      type: String,
      required: true,
    },
    original_filename: {
      type: String,
      required: false,
    },
    file_size: {
      type: Number,
      required: false,
    },
    mime_type: {
      type: String,
      required: false,
    },
    uploaded_at: {
      type: Date,
      required: true,
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

export const FileModel = mongoose.model<IFile>('File', fileSchema);
