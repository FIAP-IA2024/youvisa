import mongoose, { Schema, Document } from 'mongoose';

/**
 * One InteractionLog document per inbound user message.
 * The agent service writes one of these at the end of every pipeline run
 * (whether the response was sent, skipped due to handoff, or blocked by
 * the input filter).
 */

export interface IAgentTraceEntry {
  /** Pipeline step name (e.g., 'input-filter', 'intent-classifier') */
  step: string;
  started_at: Date;
  duration_ms: number;
  /** Step-specific structured output (intent + confidence, entities, etc.) */
  output: Record<string, unknown>;
  /** Set when the step failed; the pipeline still continues with a fallback */
  error?: string;
}

export interface IInteractionLog extends Document {
  /** Currently the conversation_id; reserved for future channels with their own session model */
  session_id: string;
  user_id: mongoose.Types.ObjectId;
  conversation_id: mongoose.Types.ObjectId;
  /** Forward-compat for whatsapp/webchat — Sprint 4 only emits 'telegram' */
  channel: 'telegram' | 'whatsapp' | 'webchat';
  user_message: string;
  /** Result of the Intent Classifier (or 'injection_attempt' / 'transferred' for short-circuits) */
  intent: string;
  intent_confidence: number;
  entities: Record<string, unknown>;
  agent_trace: IAgentTraceEntry[];
  /** Empty string when the bot stayed silent (handoff or injection block with no reply) */
  response: string;
  /** True when the bot intentionally did not reply (handoff active) */
  response_skipped: boolean;
  total_latency_ms: number;
  created_at: Date;
}

const agentTraceSchema = new Schema<IAgentTraceEntry>(
  {
    step: { type: String, required: true },
    started_at: { type: Date, required: true },
    duration_ms: { type: Number, required: true },
    output: { type: Schema.Types.Mixed, default: {} },
    error: { type: String },
  },
  { _id: false },
);

const interactionLogSchema = new Schema<IInteractionLog>(
  {
    session_id: { type: String, required: true, index: true },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['telegram', 'whatsapp', 'webchat'],
      default: 'telegram',
    },
    user_message: { type: String, required: true },
    intent: { type: String, required: true, index: true },
    intent_confidence: { type: Number, default: 0 },
    entities: { type: Schema.Types.Mixed, default: {} },
    agent_trace: { type: [agentTraceSchema], default: [] },
    response: { type: String, default: '' },
    response_skipped: { type: Boolean, default: false },
    total_latency_ms: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

export const InteractionLogModel = mongoose.model<IInteractionLog>(
  'InteractionLog',
  interactionLogSchema,
);
