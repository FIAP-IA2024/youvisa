---
tags:
  - learning
  - concept
related: []
created: 2026-04-26
---
# Status change notifications use deterministic templates, never LLM

When a visa process transitions state (e.g., `recebido → em_analise`), the user receives a Telegram message rendered from a hardcoded template. There is **no LLM call** in this path. The n8n workflow `app/n8n/workflows/status-notification.template.json` has a Code node with literal strings per transition pair.

## Context

Discovered while tracing the post-FSM-transition flow. The decision is documented in `docs/RELATORIO_SPRINT_3.md` §1.3 and is grounded in the Sprint 3 governance requirement that "the IA must not infer prazos, aprovações finais ou decisões institucionais".

## How It Works

- After a successful FSM transition, `app/api/src/controllers/process.controller.ts:_notifyStatusChange()` does a fire-and-forget `POST` to `N8N_STATUS_WEBHOOK_URL` with `{ process_id, user_id, old_status, new_status, reason }`.
- The n8n workflow looks up the user (chat_id) and the process, then enters a Code node that switches on `(old_status, new_status)` and returns one of the pre-defined Portuguese strings (e.g., *"Olá {nome}! Seus documentos para visto de {tipo} para {pais} foram recebidos e estão sendo analisados pela nossa equipe."*).
- The rendered string is sent via Telegram's `sendMessage`. LLM is never invoked.
- Failure to notify does not roll back the FSM transition (deliberate — auditability and process integrity are independent of notification success).

## How to Apply

This is a non-negotiable governance principle (see `context/constitution.md` → "Deterministic when possible, AI when necessary"). Future sprints may be tempted to make notifications "smarter" or "more personalized" with an LLM — **don't**, unless you also build a deterministic fallback and put the change through governance review. If the visible templates feel limiting, expand the template set; do not hand the message to an LLM.
