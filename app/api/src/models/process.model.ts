import mongoose, { Schema, Document } from 'mongoose';

export const PROCESS_STATUSES = [
  'recebido',
  'em_analise',
  'pendente_documentos',
  'aprovado',
  'rejeitado',
  'finalizado',
  'cancelado',
] as const;

export type ProcessStatus = (typeof PROCESS_STATUSES)[number];

export const VISA_TYPES = [
  'turismo',
  'trabalho',
  'estudante',
  'residencia',
  'transito',
  'a_definir',
] as const;

export type VisaType = (typeof VISA_TYPES)[number];

export const VALID_TRANSITIONS: Record<string, string[]> = {
  recebido: ['em_analise', 'cancelado'],
  em_analise: ['pendente_documentos', 'aprovado', 'rejeitado', 'cancelado'],
  pendente_documentos: ['em_analise', 'cancelado'],
  aprovado: ['finalizado', 'cancelado'],
  rejeitado: [],
  finalizado: [],
  cancelado: [],
};

export interface IStatusHistoryEntry {
  from_status: string;
  to_status: string;
  reason: string;
  changed_by: string;
  timestamp: Date;
}

export interface IProcess extends Document {
  user_id: mongoose.Types.ObjectId;
  conversation_id?: mongoose.Types.ObjectId;
  visa_type: VisaType;
  destination_country: string;
  status: ProcessStatus;
  status_history: IStatusHistoryEntry[];
  documents: mongoose.Types.ObjectId[];
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    from_status: { type: String, required: true },
    to_status: { type: String, required: true },
    reason: { type: String, default: '' },
    changed_by: { type: String, default: 'system' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const processSchema = new Schema<IProcess>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: false,
    },
    visa_type: {
      type: String,
      enum: VISA_TYPES,
      required: true,
    },
    destination_country: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: PROCESS_STATUSES,
      default: 'recebido',
      index: true,
    },
    status_history: {
      type: [statusHistorySchema],
      default: [],
    },
    documents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'File',
      },
    ],
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

export const ProcessModel = mongoose.model<IProcess>('Process', processSchema);
