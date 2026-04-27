---
tags:
  - learning
  - reference
related: []
created: 2026-04-26
---
# n8n workflows are templates with `__PLACEHOLDER__` tokens substituted at deploy time

The n8n workflow JSON files in `app/n8n/workflows/` are committed as `*.template.json` with placeholders such as `__API_URL__`, `__API_KEY__`, `__S3_BUCKET__`, `__VALIDATION_URL__`, `__NLP_URL__`, `__STATUS_WEBHOOK_URL__`. The `scripts/generate-workflow.sh` script substitutes them from `.env` and writes a generated `*.output.json`, which is **gitignored** because it contains real credentials.

## Context

Investigated while running the harness audit and reading `.gitignore` line 65 (`app/n8n/workflows/telegram.output.json`). The split between template and output is not obvious from a quick `ls` of the workflows directory.

## How It Works

- Tracked in git: `telegram.template.json`, `status-notification.template.json`.
- Not tracked (gitignored): `telegram.output.json`, `status-notification.output.json` (and any other `*.output.json`).
- `scripts/generate-workflow.sh` is interactive but pre-fills defaults from `.env` (commit `276fa57`). It runs sed-style substitutions on each placeholder.
- The output file is mounted into the n8n container via the Docker Compose volume `app/n8n/workflows`.
- Convenience target: `make workflow`.

## How to Apply

When changing a workflow:
1. Edit the **`.template.json`**, never the `.output.json`.
2. For any value that varies per environment (URLs, secrets, bucket names), add a `__PLACEHOLDER__` token instead of hardcoding.
3. Add the placeholder substitution to `scripts/generate-workflow.sh` if it's a new env var.
4. Regenerate via `make workflow` and re-import in n8n.

Never commit a `*.output.json` — they contain credentials. The current gitignore covers `telegram.output.json` explicitly; if you add a new output file, extend the ignore rule.
