"use server";

import { getConversations, updateConversation, type Conversation } from "@/lib/api";

export async function fetchConversations(): Promise<Conversation[]> {
  return await getConversations();
}

export async function setConversationStatus(
  id: string,
  status: "active" | "transferred" | "resolved" | "closed"
): Promise<Conversation | null> {
  return await updateConversation(id, { status });
}
