---
tags:
  - learning
  - concept
related:
  - "[[nlp-direct-mongodb-access]]"
created: 2026-04-26
---
# Bot ↔ human handoff uses `conversation.status=transferred` + `skip_response: true`

When a user asks for a human agent, the NLP Lambda flips `conversation.status` to `transferred` in MongoDB. From that point on, every subsequent inbound message takes a short-circuit path: the NLP Lambda returns `{ skip_response: true }`, and the n8n Telegram workflow's `Check Skip Response?` IF node ends the flow without sending any Telegram reply. The operator console (or anyone with API access) can flip status back to `active` to resume the bot.

## Context

Investigated to identify what Sprint 4's multi-agent refactor must not regress. Easy to break accidentally because the silencing happens in **two layers** (Lambda return shape + n8n IF node) and any redesign of either one can desynchronize the contract.

## How It Works

**Activation (user says "quero falar com atendente"):**
- `app/nlp/src/handler.py` calls Bedrock; the LLM returns `intent=want_human`.
- `handler.py:158-161` calls `mongo.update_conversation_status(conversation['_id'], 'transferred')`.
- The Lambda response includes a confirmation message (`TRANSFERRED_MESSAGE` from `prompts.py`).

**While transferred (every subsequent inbound message):**
- `handler.py:92-103` runs **before** any LLM call: if `conversation.status == 'transferred'`, return immediately with `{ response: '', intent: 'transferred', skip_response: true }`.
- n8n Telegram workflow node `Check Skip Response?` (an IF node) reads `skip_response` from the Lambda result and terminates the flow when true. No `sendMessage` happens.
- The user's message is still saved to `messages` (so the operator sees it in the console), but the bot is silent.

**Resume (operator clicks "Voltar para Bot" in the console):**
- Frontend calls `PUT /conversations/:id` with `{ status: 'active' }`.
- Next inbound message: `handler.py` no longer short-circuits, NLP runs normally.

## How to Apply

Sprint 4's multi-agent orchestrator **must preserve this contract end-to-end**:
1. Check `conversation.status === 'transferred'` **before invoking any agent**, not after.
2. Return a response shape compatible with the existing n8n IF node — i.e., include `skip_response: true` at the top level when transferred.
3. The "operator returns conversation to bot" flow must continue working — do not break the `PUT /conversations/:id` path.

**Test:** send "quero humano" via Telegram, verify bot stops responding to follow-up messages, return conversation via console, verify bot responds again.
