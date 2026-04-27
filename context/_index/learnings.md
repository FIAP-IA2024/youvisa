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

## `#reference` — Environment and commands

- [[../learnings/n8n-workflow-placeholders|n8n workflows are templates with `__PLACEHOLDER__` tokens substituted at deploy time]]

## `#gotcha` — Things that tripped us up

- [[../learnings/bedrock-region-quirk|AWS Bedrock Claude lives in `us-east-1`, not the project's `sa-east-1`]]
