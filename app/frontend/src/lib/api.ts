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

// API Functions
export async function getUsers(): Promise<User[]> {
  const response = await fetchApi<User[]>("/users");
  return response.data || [];
}

export async function getConversations(filters?: {
  status?: string;
  channel?: string;
}): Promise<Conversation[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.channel) params.append("channel", filters.channel);

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetchApi<Conversation[]>(`/conversations${query}`);
  return response.data || [];
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

export async function updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation | null> {
  const response = await fetchApi<Conversation>(`/conversations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data || null;
}

// Dashboard Stats
export async function getDashboardStats() {
  const [users, conversations, files] = await Promise.all([
    getUsers(),
    getConversations(),
    getFiles(),
  ]);

  const classificationCounts = files.reduce(
    (acc, file) => {
      const type = file.document_type || "Sem classificacao";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalUsers: users.length,
    totalConversations: conversations.length,
    totalFiles: files.length,
    classificationCounts,
    recentFiles: files.slice(0, 5),
  };
}
