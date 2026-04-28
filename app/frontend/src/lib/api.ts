const API_URL = process.env.API_URL || process.env.LAMBDA_FUNCTION_URL || "http://localhost:5555";
const API_KEY = process.env.API_KEY || "fiap-iatron";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        ...options?.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Types
export interface User {
  _id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_bot: boolean;
  email?: string;
  email_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  _id: string;
  user_id: string;
  channel: "telegram" | "whatsapp" | "webchat";
  chat_id: string;
  status: "active" | "transferred" | "resolved" | "closed";
  started_at: string;
  last_message_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  _id: string;
  conversation_id: string;
  message_id: string;
  user_id: string;
  text?: string;
  message_type: "text" | "document" | "photo" | "video" | "audio";
  direction: "incoming" | "outgoing";
  timestamp: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface File {
  _id: string;
  conversation_id: string;
  message_id: string;
  file_id: string;
  s3_bucket: string;
  s3_key: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
  created_at: string;
  document_type?: string;
  classification_confidence?: number;
  classification_status?: string;
  classified_at?: string;
}

// Process Types
export const VALID_TRANSITIONS: Record<string, string[]> = {
  recebido: ["em_analise", "cancelado"],
  em_analise: ["pendente_documentos", "aprovado", "rejeitado", "cancelado"],
  pendente_documentos: ["em_analise", "cancelado"],
  aprovado: ["finalizado", "cancelado"],
  rejeitado: [],
  finalizado: [],
  cancelado: [],
};

export interface StatusHistoryEntry {
  from_status: string;
  to_status: string;
  reason: string;
  changed_by: string;
  timestamp: string;
}

export interface Process {
  _id: string;
  user_id: string;
  conversation_id?: string;
  visa_type: string;
  destination_country: string;
  status: string;
  status_history: StatusHistoryEntry[];
  documents: File[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Sprint 4: InteractionLog (written by app/agent at end of each pipeline run)
export interface AgentTraceEntry {
  step: string;
  started_at: string;
  duration_ms: number;
  output: Record<string, unknown>;
  error?: string;
}

export interface InteractionLog {
  _id: string;
  session_id: string;
  user_id: string;
  conversation_id: string;
  channel: "telegram" | "whatsapp" | "webchat";
  user_message: string;
  intent: string;
  intent_confidence: number;
  entities: Record<string, unknown>;
  agent_trace: AgentTraceEntry[];
  response: string;
  response_skipped: boolean;
  total_latency_ms: number;
  created_at: string;
}

// Visa guidance (the same JSON as app/agent/src/knowledge/visa-guidance.json,
// fetched at runtime from the agent service so the source of truth stays single).
export interface VisaGuidance {
  label: string;
  general_info: string;
  next_steps: string[];
}
export type VisaGuidanceMap = Record<string, VisaGuidance>;

// API Functions
export async function getUsers(): Promise<User[]> {
  const response = await fetchApi<User[]>("/users");
  return response.data || [];
}

export async function getConversations(filters?: {
  status?: string;
  channel?: string;
  user_id?: string;
}): Promise<Conversation[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.channel) params.append("channel", filters.channel);
  if (filters?.user_id) params.append("user_id", filters.user_id);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetchApi<Conversation[]>(`/conversations${query}`);
  return response.data || [];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const response = await fetchApi<Conversation>(`/conversations/${id}`);
  return response.data || null;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const response = await fetchApi<Message[]>(`/messages?conversation_id=${conversationId}`);
  return response.data || [];
}

export async function getFiles(filters?: {
  conversation_id?: string;
}): Promise<File[]> {
  const params = new URLSearchParams();
  if (filters?.conversation_id) params.append("conversation_id", filters.conversation_id);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetchApi<File[]>(`/files${query}`);
  return response.data || [];
}

// Process API Functions
export async function getProcesses(filters?: {
  status?: string;
  user_id?: string;
  visa_type?: string;
}): Promise<Process[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.user_id) params.append("user_id", filters.user_id);
  if (filters?.visa_type) params.append("visa_type", filters.visa_type);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetchApi<Process[]>(`/processes${query}`);
  return response.data || [];
}

export async function getProcess(id: string): Promise<Process | null> {
  const response = await fetchApi<Process>(`/processes/${id}`);
  return response.data || null;
}

export async function getProcessHistory(id: string): Promise<{
  status: string;
  history: StatusHistoryEntry[];
} | null> {
  const response = await fetchApi<{ status: string; history: StatusHistoryEntry[] }>(`/processes/${id}/history`);
  return response.data || null;
}

export async function updateProcessStatus(
  id: string,
  status: string,
  reason?: string,
  changed_by?: string
): Promise<Process | null> {
  const body: Record<string, string> = { status };
  if (reason) body.reason = reason;
  if (changed_by) body.changed_by = changed_by;
  const response = await fetchApi<Process>(`/processes/${id}/status`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.data || null;
}

export async function createProcess(data: {
  user_id: string;
  visa_type: string;
  destination_country: string;
  conversation_id?: string;
  notes?: string;
}): Promise<Process | null> {
  const response = await fetchApi<Process>("/processes", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data || null;
}

export async function updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | null> {
  const response = await fetchApi<Conversation>(`/conversations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data || null;
}

// Sprint 4: Interaction Log fetchers
export async function getInteractionLogs(filters?: {
  intent?: string;
  user_id?: string;
}): Promise<InteractionLog[]> {
  const params = new URLSearchParams();
  if (filters?.intent) params.append("intent", filters.intent);
  if (filters?.user_id) params.append("user_id", filters.user_id);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetchApi<InteractionLog[]>(`/interactions${query}`);
  return response.data || [];
}

export async function getInteractionLogsByUser(userId: string): Promise<InteractionLog[]> {
  const response = await fetchApi<InteractionLog[]>(`/interactions/user/${userId}`);
  return response.data || [];
}

export async function getInteractionLogsByConversation(conversationId: string): Promise<InteractionLog[]> {
  const response = await fetchApi<InteractionLog[]>(`/interactions/conversation/${conversationId}`);
  return response.data || [];
}

// Visa guidance lives in the agent service (single source of truth shared
// with the Response Generator). The portal fetches it at request time.
//
// Server-side (RSC fetching) uses AGENT_URL which inside the docker network
// is `http://agent:7777`. Client-side bundles get NEXT_PUBLIC_AGENT_URL
// which points at the host-exposed `http://localhost:7777`.
const AGENT_URL_SERVER =
  typeof window === "undefined"
    ? process.env.AGENT_URL || "http://agent:7777"
    : process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:7777";

export async function getVisaGuidance(): Promise<VisaGuidanceMap> {
  try {
    const res = await fetch(`${AGENT_URL_SERVER}/knowledge/visa-guidance`, { cache: "no-store" });
    if (!res.ok) throw new Error(`agent returned ${res.status}`);
    return (await res.json()) as VisaGuidanceMap;
  } catch (err) {
    console.error("getVisaGuidance failed:", err);
    return {};
  }
}

export async function getUser(id: string): Promise<User | null> {
  const response = await fetchApi<User>(`/users/${id}`);
  return response.data || null;
}

// Dashboard Stats
export async function getDashboardStats() {
  const [users, conversations, files, processes] = await Promise.all([
    getUsers(),
    getConversations(),
    getFiles(),
    getProcesses(),
  ]);

  const classificationCounts = files.reduce(
    (acc, file) => {
      const type = file.document_type || "Sem classificacao";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const processStatusCounts = processes.reduce(
    (acc, process) => {
      acc[process.status] = (acc[process.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalUsers: users.length,
    totalConversations: conversations.length,
    totalFiles: files.length,
    totalProcesses: processes.length,
    classificationCounts,
    processStatusCounts,
    recentFiles: files.slice(0, 5),
  };
}
