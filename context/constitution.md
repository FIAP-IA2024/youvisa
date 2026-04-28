---
status: canonical
created: 2026-04-26
---
# YOUVISA — Constitution

This document declares the non-negotiable principles of the YOUVISA project. Everything here has earned its place by being a decision we never want to re-litigate or a constraint we never want to forget. Agents and humans must read this file before making any substantive change.

If you are tempted to violate a rule here, stop and open a discussion first. Never silently work around the constitution.

## Why YOUVISA exists

YOUVISA is an academic FIAP project (Inteligência Artificial graduation, turma 1TIAOR-2024/2) that proposes — and implements — an AI-powered multichannel customer service platform for a Brazilian consular-services company. It targets four operational pains: high average service time (35 → 12 min), document rework (18% → <5%), low lead-to-client conversion (22% → 38%), and low NPS (70 → 90). The platform uses a Telegram-first conversational agent, document classification with vision AI, deterministic FSM-based process management, and an operator console for human handoff.

The project is delivered in sprints. Sprint 1 was the architecture proposal; Sprint 2 shipped the MVP (chatbot + classification + handoff + console); Sprint 3 added FSM-based process management with state-change notifications; Sprint 4 evolves the system into multi-agent orchestration with explicit intent/entity extraction and a customer-facing portal.

## Scope guardrails

- This is an **academic deliverable**, not a production rollout. Production hardening — full CI/CD, multi-tenancy, formal LGPD audit, KMS rotation, SIEM alerting — is explicitly out of scope.
- **Multi-channel beyond Telegram is descoped.** WhatsApp and Webchat exist in the data schema (`Conversation.channel`) but are not implemented and should not be added unless a sprint explicitly requires it.
- **Real document data extraction (OCR) is out of scope.** The platform classifies documents by type (Passaporte, RG, Comprovante, Formulário) and validates image quality, but does not extract structured fields. Textract was attempted in Sprint 2 and removed.
- **Authentication beyond a single hardcoded operator and an `x-api-key` header is out of scope** unless a sprint explicitly requires multi-user RBAC.
- **AWS deploys are paused.** Sprint 4 onward runs entirely locally via Docker Compose; do not add new code paths that require AWS-only resources.

## Architecture principles

- **Modular services with clear boundaries.** The system is split across `app/api` (TypeScript Fastify), `app/nlp` (Python conversational agent), `app/classifier` (Python vision classifier), `app/validation` (Python OpenCV image quality), `app/frontend` (Next.js operator + customer interfaces), `app/n8n` (workflow orchestrator). Cross-service contracts go through HTTP only — never shared in-memory state.
- **Deterministic when possible, AI when necessary.** Status-change notifications use pre-defined templates (no LLM) to eliminate hallucination risk in official communications. AI is used only where natural language must be interpreted or generated.
- **FSM owns process lifecycle.** Visa-process state transitions are validated against `VALID_TRANSITIONS` in the repository layer before any persistence; every transition is appended to `status_history` with timestamp, reason, and actor. State is never mutated outside this code path.
- **Auditability over convenience.** Every interaction with the user (message, classification, status change, intent classification) must be persisted in a way that supports later audit. Loss of an interaction log is treated as a bug.
- **API-key authentication on every endpoint except `/health`.** No exceptions, even for internal-only services. The header is `x-api-key`.
- **LGPD-friendly data placement.** When AWS is used, all data resources (S3, MongoDB) live in `sa-east-1`. Bedrock calls (the only exception) target `us-east-1` because the model is not available in São Paulo.

## Tooling and workflow principles

- **Package managers:** `npm` for Node services (`app/api`, `app/frontend`); `pip` with `requirements.txt` for Python services (`app/nlp`, `app/classifier`, `app/validation`). Lock files are committed.
- **Stack:**
  - API: TypeScript + Fastify 5 + Mongoose + tsyringe (DI) + tsup (bundling); Node 22 runtime.
  - Lambdas: Python 3.11 + boto3 + pymongo.
  - Frontend: Next.js 15 (App Router) + React 19 + Tailwind 4 + shadcn/ui.
  - Orchestrator: n8n.
  - DB: MongoDB Atlas.
  - AI: Claude (Anthropic). For Sprint 4+, the **Claude Agent SDK** is used inside Docker with credentials mounted from the host. Existing Bedrock-based Lambdas (`nlp`, `classifier`) are kept for backward compatibility but not extended.
  - IaC: Terraform (paused; no new modules).
  - Local orchestration: Docker Compose driven by a top-level `Makefile`.
- **No CI/CD currently.** All checks are run locally before commit.
- **No automated test suite currently.** When tests are added in a sprint, they go in a `tests/` folder co-located with the service and are documented in the spec.
- **Commits never include AI-attribution lines** (no `Co-Authored-By: Claude`, no "Generated by ..."). This is a hard team rule.
- **`main` is protected by convention** — never push directly. All work goes through a feature branch (e.g., `sprint/4`) and a PR.

## Spec-Driven workflow

Before implementing any user request, assess whether the solution is obvious. If you cannot describe the complete solution in one sentence, use the Spec Kit flow: brainstorm → `spec.md` → `plan.md` → `tasks.md` → implement. If the solution is obvious, go direct. If almost obvious but with 1-2 open decisions, ask the user whether to spec or go direct.

Specs never get deleted. Shipped specs remain in `context/specs/` as historical record.

## Knowledge layering

- Project-specific knowledge lives in `context/`. Only add notes here for things unique to YOUVISA.
- Generic patterns that apply to any project should not be duplicated in this vault.

## What this constitution is not

- Not an architecture document. See `context/_index/learnings.md` for architecture notes.
- Not a style guide. See `context/conventions/` for code style conventions.
- Not a spec for any feature. Specs live in `context/specs/`.

This document exists to hold the things that would be catastrophic to forget.
