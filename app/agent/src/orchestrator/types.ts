/**
 * Types shared across the multi-agent pipeline.
 *
 * The pipeline runs:
 *   Input Filter -> Intent Classifier -> Entity Extractor -> Lookup
 *     -> Response Generator -> Output Filter -> Logger
 *
 * Each step appends to AgentTraceEntry[] which is persisted to the
 * `interaction_logs` collection for audit and the customer portal's
 * "interaction history" panel.
 */

export const INTENTS = [
  'status_query',
  'document_question',
  'want_human',
  'provide_email',
  'open_portal',
  'general',
  'injection_attempt',
  'transferred',
] as const;

export type Intent = (typeof INTENTS)[number];

export interface Entities {
  visa_type?: string;
  country?: string;
  process_id?: string;
  doc_type?: string;
  email?: string;
  dates?: string[];
}

export interface PipelineInput {
  user_id: string;
  conversation_id: string;
  chat_id: string;
  user_message: string;
}

export interface PipelineOutput {
  response: string;
  response_skipped: boolean;
  intent: Intent;
  intent_confidence: number;
  entities: Entities;
  agent_trace: AgentTraceEntry[];
  total_latency_ms: number;
  /** Set when the response generator suggested a portal URL — surfaces to the route */
  portal_url?: string;
}

export interface AgentTraceEntry {
  step: string;
  started_at: Date;
  duration_ms: number;
  output: Record<string, unknown>;
  error?: string;
}
