/**
 * Thin client for the Fastify API.
 *
 * The agent service uses HTTP for *write* operations against the
 * existing API (upsert user/conversation, save messages) so the API
 * remains the single source of truth for those entities and stays
 * consistent with the operator console's expectations.
 *
 * For *read* operations during the pipeline (lookup of processes,
 * files), the agent reads MongoDB directly — see
 * context/learnings/nlp-direct-mongodb-access.md.
 */

import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

const env = getEnv();

async function request<T = unknown>(
  path: string,
  init: RequestInit & { body?: any } = {},
): Promise<T> {
  const url = `${env.API_URL}${path}`;
  const headers: Record<string, string> = {
    'x-api-key': env.API_KEY,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  let body = init.body;
  if (body && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, { ...init, headers, body });
  const text = await res.text();
  if (!res.ok) {
    logger.warn({ url, status: res.status, body: text }, 'api request failed');
    throw new Error(`api ${path} returned ${res.status}: ${text}`);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export interface ApiUser {
  _id: string;
  telegram_id: string;
  email?: string;
  first_name?: string;
  username?: string;
}

export interface ApiConversation {
  _id: string;
  user_id: string;
  channel: string;
  chat_id: string;
  status: string;
}

export async function upsertUser(data: {
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_bot?: boolean;
}): Promise<ApiUser> {
  const res = await request<{ success: boolean; data: ApiUser }>(
    `/users/upsert/${data.telegram_id}`,
    { method: 'POST', body: data },
  );
  return res.data;
}

export async function upsertConversation(data: {
  user_id: string;
  channel: 'telegram' | 'whatsapp' | 'webchat';
  chat_id: string;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<ApiConversation> {
  const res = await request<{ success: boolean; data: ApiConversation }>(
    `/conversations/upsert`,
    { method: 'POST', body: { ...data, last_message_at: new Date() } },
  );
  return res.data;
}

export interface ApiMessage {
  _id: string;
  conversation_id: string;
  message_id: string;
  user_id: string;
}

export async function saveMessage(data: {
  conversation_id: string;
  message_id: string;
  user_id: string;
  text?: string;
  message_type: 'text' | 'document' | 'photo' | 'video' | 'audio';
  direction: 'incoming' | 'outgoing';
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}): Promise<ApiMessage> {
  const res = await request<{ success: boolean; data: ApiMessage }>(`/messages`, {
    method: 'POST',
    body: { ...data, timestamp: data.timestamp ?? new Date() },
  });
  return res.data;
}

export async function saveFile(data: {
  conversation_id: string;
  /** ObjectId of the Message document (NOT Telegram's external message_id) */
  message_id: string;
  file_id: string;
  s3_bucket: string;
  s3_key: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at?: Date;
}): Promise<unknown> {
  return request(`/files`, {
    method: 'POST',
    body: { ...data, uploaded_at: data.uploaded_at ?? new Date() },
  });
}
