"use server";

import { updateConversation } from "@/lib/api";

export async function requestHandoff(conversationId: string): Promise<boolean> {
  const result = await updateConversation(conversationId, { status: "transferred" });
  return result !== null;
}
