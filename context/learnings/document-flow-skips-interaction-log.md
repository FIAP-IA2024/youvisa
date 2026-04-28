---
tags:
  - learning
  - gotcha
  - multi-agent
  - document-flow
related:
  - "[[../specs/2026-04-26-sprint-4-multi-agent/spec]]"
  - "[[telegram-web-file-upload-mechanism]]"
created: 2026-04-27
---
# Document upload flow does NOT write `interaction_log` — only the multi-agent text pipeline does

When a Telegram user sends a photo, `app/agent/src/classifier/document-flow.ts` runs an
isolated pipeline (validate → MinIO put_object → save File → Claude Vision classify → reply
via `sendMessage`). It deliberately bypasses the multi-agent text pipeline (input-filter →
intent → entity → lookup → response → output-filter), so **no `interaction_log` document
is created for an image upload**. Only text messages produce interaction logs.

This breaks any "wait for the bot to respond" helper that polls the API for a new
`interaction_log` after the user message. `waitForBotResponseConfirmed` in the demo
recording script uses both signals (Telegram bubble + interaction_log) and warns if either
times out. For text turns it confirms with both. For image turns it confirms only via the
bubble — the API check stays false and the warning fires, but the recording continues
correctly because the bubble check has already succeeded.

## Context

Discovered during the Sprint 4 v5 demo recording (`scripts/record-demo-v2-tg.mjs` with
upload scenes added on `sprint/4-extra` branch). Three `waitForBotResponseConfirmed timed
out` warnings appeared in the recording log: one for Q1 (transient — bubble counter lag)
and two for the upload scenes (Q3 blurry + Q4 good). The two upload warnings always show
`api=false` even though `bubble=true` because no interaction_log is written. The recording
itself was unaffected; the bot replies (rejection + classification) were captured in the
final video.

## How to Apply

When designing instrumentation or end-of-turn waiters for the agent service:

- Don't assume every user turn produces an `interaction_log`. Image turns don't.
- For demo automation that needs to wait on image-upload responses, prefer the Telegram
  `.bubble.is-in` count signal alone, OR add a separate signal source (e.g. poll
  `Files.findOne({ s3_key: ... })` until `classification_status === 'completed'`).
- If you ever need image turns to be queryable per-user the same way text turns are, the
  fix is to write an `interaction_log` from `document-flow.ts` after the classification
  reply is sent — with `intent: 'document_upload'` and the agent_trace populated by the
  validate/upload/classify steps. This would also unify the operator console's
  `/dashboard/interactions` view (currently text-only).
