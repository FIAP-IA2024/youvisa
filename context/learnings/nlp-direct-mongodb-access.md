---
tags:
  - learning
  - concept
related:
  - "[[bot-handoff-mechanism]]"
created: 2026-04-26
---
# NLP Lambda reads MongoDB directly, not through the API

The original Sprint 3 plan (`docs/SPRINT_3_PLANO.md`) had the NLP Lambda calling `GET /processes/telegram/:telegramId` over HTTP to fetch process state for status queries. The shipped implementation does **not** do that — the Lambda opens its own MongoDB connection and queries `users` and `processes` directly. The HTTP endpoint exists, but only the operator frontend uses it.

## Context

Investigated while sketching Sprint 4's multi-agent flow, where a "lookup agent" needs to read process state. The decision and rationale are in `docs/RELATORIO_SPRINT_3.md` §1.2.

## How It Works

- `app/nlp/src/handler.py:127` invokes `mongo.get_processes_by_telegram_id(telegram_id)`.
- `app/nlp/src/mongodb.py:219` looks up the user by `telegram_id` then queries `processes` directly with `find({user_id: user._id})`, returning up to 5 most recent.
- Bedrock receives the process records via `_format_processes()` in `bedrock.py` and the SYSTEM_PROMPT injects them as the `{processes}` substitution.
- Connection string comes from `MONGODB_URI` env, same as the API uses.

Why this beat the API path: avoids Lambda → Lambda HTTP latency and the circular dependency that arises when the API is itself a Lambda Function URL.

## How to Apply

For Sprint 4's multi-agent design, keep the agent → MongoDB direct read pattern for backend services; do not introduce the API as middleware between agents and the database. If a new service needs read access (intent classifier, entity extractor, lookup agent), give it its own Mongo connection. Reserve API endpoints for the frontend (operator console, customer portal) — those are the legitimate HTTP consumers.
