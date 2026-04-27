"use server";

import { verifyPortalToken } from "@/lib/jwt";
import { getConversation, updateConversation } from "@/lib/api";

/**
 * Server action used by the portal's "Falar com atendente" button.
 *
 * Authorization model: the JWT for the current portal session is the
 * source of truth for `user_id`. We re-verify the token on every call
 * (it's signed, has a 24h TTL, and ships in the URL path) and then
 * load the target conversation to assert its `user_id` matches.
 *
 * Without this check, any authenticated portal client could pass any
 * `conversationId` and force-transfer another customer's chat — a
 * cross-customer write IDOR.
 */
export async function requestHandoff(
  token: string,
  conversationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const payload = await verifyPortalToken(token);
  if (!payload) {
    return { ok: false, error: "session_expired" };
  }

  const conv = await getConversation(conversationId);
  if (!conv) {
    return { ok: false, error: "conversation_not_found" };
  }
  if (conv.user_id !== payload.user_id) {
    // Authorization failure — don't leak whether the conversation exists,
    // and refuse to mutate.
    return { ok: false, error: "forbidden" };
  }

  const result = await updateConversation(conversationId, {
    status: "transferred",
  });
  if (!result) {
    return { ok: false, error: "update_failed" };
  }
  return { ok: true };
}
