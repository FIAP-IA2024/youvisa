---
tags:
  - moc
---
# Learnings — Map of Content

Atomic notes about YOUVISA's architecture, patterns, and gotchas. Categorized by tag.

Learnings here are specific to YOUVISA. Code style conventions live in `[[conventions|Conventions MOC]]`.

## `#concept` — Architecture and patterns

- [[../learnings/sprint-2-ocr-pivot|Sprint 2 dropped OCR (Textract) in favor of Validation + Classifier]]
- [[../learnings/nlp-direct-mongodb-access|NLP Lambda reads MongoDB directly, not through the API]]
- [[../learnings/status-notifications-deterministic|Status change notifications use deterministic templates, never LLM]]
- [[../learnings/bot-handoff-mechanism|Bot ↔ human handoff uses `conversation.status=transferred` + `skip_response: true`]]
- [[../learnings/document-flow-skips-interaction-log|Document upload flow does NOT write `interaction_log` — only text turns do]]

## `#reference` — Environment and commands

- [[../learnings/n8n-workflow-placeholders|n8n workflows are templates with `__PLACEHOLDER__` tokens substituted at deploy time]]

## `#gotcha` — Things that tripped us up

- [[../learnings/bedrock-region-quirk|AWS Bedrock Claude lives in `us-east-1`, not the project's `sa-east-1`]]
- [[../learnings/claude-vision-oauth-token-refresh|Claude OAuth tokens expire ~ every 8h — sync from macOS Keychain on demand]]
- [[../learnings/telegram-web-bubble-counter-virtual-scrolling|Telegram WebK uses virtual scrolling — count `.is-in` bubbles, not `.bubble`]]
- [[../learnings/telegram-web-file-upload-mechanism|Telegram WebK file upload requires the 📎 menu + filechooser — not direct setInputFiles]]
- [[../learnings/nextjs-16-middleware-renamed-proxy|Next.js 16 renamed `middleware.ts` to `proxy.ts` — silently 404s the old form]]
