/**
 * Direct-MongoDB repositories used by the agent service.
 *
 * Sprint 4 follows the existing project pattern (see
 * context/learnings/nlp-direct-mongodb-access.md): backend services read
 * directly from Mongo rather than going through the API to avoid
 * service-to-service HTTP latency. The HTTP API is reserved for the
 * frontend and external clients.
 */

import mongoose, { Schema } from 'mongoose';

// ---- User ----
const userSchema = new Schema(
  {
    telegram_id: { type: String, required: true, unique: true, index: true },
    username: String,
    first_name: String,
    last_name: String,
    language_code: String,
    is_bot: { type: Boolean, default: false },
    email: String,
    email_updated_at: Date,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false },
);

// ---- Conversation ----
const conversationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['telegram', 'whatsapp', 'webchat'], required: true },
    chat_id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'transferred', 'resolved', 'closed'],
      default: 'active',
    },
    last_message_at: Date,
    started_at: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false },
);

// ---- Process ----
const processSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    visa_type: String,
    destination_country: String,
    status: { type: String, index: true },
    status_history: { type: [Schema.Types.Mixed], default: [] },
    documents: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    notes: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false },
);

// ---- File ----
const fileSchema = new Schema(
  {
    conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    message_id: String,
    file_id: String,
    s3_bucket: String,
    s3_key: String,
    original_filename: String,
    file_size: Number,
    mime_type: String,
    uploaded_at: Date,
    document_type: String,
    classification_confidence: Number,
    classification_status: String,
    classified_at: Date,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: false },
);

// Bind models lazily so connectMongo runs first.
function model<T = any>(name: string, schema: Schema): mongoose.Model<T> {
  return (mongoose.models[name] as mongoose.Model<T>) || mongoose.model<T>(name, schema);
}

export const UserModel = () => model('User', userSchema);
export const ConversationModel = () => model('Conversation', conversationSchema);
export const ProcessModel = () => model('Process', processSchema);
export const FileModel = () => model('File', fileSchema);

// ---- Read helpers used by the pipeline ----

export async function findUserByTelegramId(telegramId: string) {
  return UserModel().findOne({ telegram_id: String(telegramId) }).lean();
}

export async function findConversationByChatId(chatId: string) {
  return ConversationModel().findOne({ chat_id: String(chatId) }).lean();
}

export async function findProcessesByUserId(userId: string, limit = 5) {
  return ProcessModel()
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
}

export async function findFilesByUserId(userId: string, limit = 10) {
  // Files are scoped via conversation_id -> conversation -> user_id, but
  // many docs in this dataset persist with file.metadata.user_id too.
  // For now, fetch via the user's conversations.
  const convs = await ConversationModel().find({ user_id: userId }).select('_id').lean();
  const convIds = convs.map((c) => c._id);
  return FileModel()
    .find({ conversation_id: { $in: convIds } })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
}
