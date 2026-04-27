# YOUVISA — Agent Instructions

YOUVISA is an AI-powered multichannel customer service platform for consular/visa services, delivered as an academic FIAP project. The system spans a TypeScript Fastify API (`app/api`), Python services for conversational NLP and document classification/validation (`app/nlp`, `app/classifier`, `app/validation`), an n8n orchestrator (`app/n8n`), and a Next.js operator/customer console (`app/frontend`). Data lives in MongoDB Atlas; documents in AWS S3 (sa-east-1). AI calls run through Claude (Anthropic). Services are orchestrated locally via Docker Compose driven by a top-level `Makefile`.

## Before starting any work

1. **Read `context/_index/home.md`** for project-specific knowledge.
2. **Read `context/constitution.md`** for non-negotiable principles.
3. **If the user is asking you to implement, modify, or create something**, assess the request: "Can I describe the complete solution in one sentence?"
   - **Yes** → implement directly.
   - **No** → invoke `/brainstorming` → `spec.md` → `/writing-plans` → `plan.md` + `tasks.md` → implement.
   - **Almost** (1-2 open decisions) → ask the user whether to spec or go direct.

   If the user is asking a question, investigating, or exploring — just answer.

## Work ethic — never the lazy path

When you see two ways to do something — one quick-and-shallow, one correct-and-thorough — **default to correct**. You may *surface* the lighter option to the user with the tradeoffs ("here's a faster path that skips X, here's the proper one that handles X — which do you want?"), but never silently pick the worse one to finish faster. Cutting corners now creates work later, and the user notices. If the task is hard, the answer is to do it right, not to redefine "done" downward.

## When stuck or in doubt — read the vault first

`context/` is your project brain. You have been writing to it; **read from it too**. Before grinding on a hard problem, before guessing, before asking the user a question whose answer might already be captured: search `context/learnings/`, `context/conventions/`, `context/rules/`, the relevant spec in `context/specs/`, and `context/constitution.md`. Use the `recall` skill or grep directly. Reading the vault is the **first move** on a hard problem, not the last. If the vault answers the question, cite the note; if it almost answers it, update the note after you fill the gap.

## After completing any task

If you discovered something non-obvious during implementation — a gotcha, a constraint, a surprising behavior — create an atomic note in `context/learnings/` using the template at `context/templates/learning.md`. Link it to the relevant spec with a wikilink if applicable. Do this without asking permission.

## After completing a spec

When a spec is shipped (all tasks in `tasks.md` done, spec marked `shipped`), always run an explicit reflection step before closing out — do not skip this:

1. Ask yourself: "What did I learn implementing this that wasn't obvious from the spec?" Consider gotchas hit, constraints discovered, surprising framework/library behavior, decisions that reversed mid-implementation, and anything a future implementer would waste time rediscovering.
2. If there is at least one useful learning, create an atomic note in `context/learnings/` per learning (one concept per note) using `context/templates/learning.md`, and link it back to the spec folder with a wikilink. Add each new note to `context/_index/learnings.md` under the appropriate category.
3. If nothing non-obvious came up, say so explicitly in the final report ("No new learnings from this spec") — silence is not the same as reflection.

## Commands (most used)

| Command | Purpose |
|---|---|
| `make start all` | Start all local services (API, n8n, etc.) via Docker Compose |
| `make stop` | Stop all local services |
| `make logs <service>` | Tail logs for a Docker Compose service |
| `cd app/api && npm run dev` | Run the API locally with hot reload (port 5555) |
| `cd app/api && npm run type-check` | Type-check the API without emitting |
| `cd app/frontend && npm run dev` | Run the Next.js console locally (port 3000) |
| `cd app/frontend && npm run build` | Production build of the Next.js console |

Full command catalog: `context/learnings/commands-catalog.md` _(create this note after setup)_.

## Knowledge locations

| What | Where |
|---|---|
| Non-negotiable principles | `context/constitution.md` |
| Specs (active + shipped) | `context/specs/` |
| Architecture, patterns, gotchas | `context/learnings/` (indexed by `context/_index/learnings.md`) |
| Code style conventions | `context/conventions/` (indexed by `context/_index/conventions.md`) |
| Project-specific rules | `context/rules/` |
| Spec template | `context/specs/_template/` |
| Note templates (learning, rule) | `context/templates/` |

## Claude Code skills and commands

These are committed to `.claude/` and provide the project's agentic workflow.

- **`brainstorming`** — design exploration before writing a spec.
- **`writing-plans`** — turn an approved design into a task list.
- **`recall`** — quick project reconnaissance of the `context/` vault.
- **`/open-pr`** — **required** command to open pull requests with auto-generated title and description. Always use this command when creating a PR.
- **`/learn`** — investigate a topic in the project and save findings as a learning note in `context/learnings/`.
- **`/spec`** — take the current conversation and enter the spec flow, skipping already-discussed questions.

---

## Project Overview

This is a FIAP academic project proposing a comprehensive AI-powered multichannel customer service platform for YOUVISA, a Brazilian company specializing in consular services. The repository contains architecture documentation, technical specifications, and design diagrams for the proposed solution.

## Repository Structure

- `README.md` - Complete project documentation including architecture, components, implementation plan, and success metrics
- `docs/diagramas/` - Architecture diagrams and DrawIO source files
  - `arquitetura_global.png` - Global architecture diagram
  - `fluxo_de_comunicacao.png` - Communication flow diagram
  - `Diagramas.drawio` - DrawIO source file for all diagrams

## Architecture Components

The proposed solution integrates the following components:

1. **n8n Platform** - Orchestration hub for omnichannel integration (WhatsApp, Webchat, Telegram)
2. **AI Conversational Agent** - NLP/LLM-based agent using LangChain/LangGraph with RAG capabilities
3. **OCR Service** - AWS Textract + Comprehend for document processing
4. **API Gateway** - AWS API Gateway + Lambda for secure backend communication
5. **Operator Console** - React-based front-end for human-assisted support with WebSocket real-time updates
6. **Data Architecture** - MongoDB for transactional data, AWS S3 for document storage

## Technology Stack (Proposed)

- **Cloud:** AWS (Sao Paulo region for LGPD compliance)
- **Orchestration:** n8n
- **AI/ML:** LangChain, LangGraph, HuggingFace models
- **OCR:** AWS Textract, AWS Comprehend
- **Backend:** AWS Lambda (serverless), AWS API Gateway
- **Database:** MongoDB (transactional), AWS S3 (documents)
- **Front-end:** React with WebSockets
- **Security:** JWT authentication, RBAC, AES-256 encryption, TLS 1.3

## Documentation Standards

When modifying documentation in this repository:

1. Maintain the comprehensive narrative style used in README.md
2. Each component section should explain both technical implementation and business value
3. All diagrams are created using DrawIO - edit `diagramas/Diagramas.drawio` and export to PNG
4. Keep architecture diagrams referenced in README.md synchronized with actual diagram files
5. Preserve the academic format with team attributions and professor information

## Key Design Principles

1. **Omnichannel continuity** - Users can switch between WhatsApp, Web, and Telegram without losing context
2. **AI-human handoff** - Seamless transfer from AI agent to human operator when needed
3. **LGPD compliance** - All data processing in AWS Sao Paulo region with proper encryption and access controls
4. **Scalability** - Serverless architecture with potential migration path to ECS/Fargate
5. **Security-first** - Multiple layers including encryption, IAM, DLP, and immutable audit logs

## Editing Diagrams

To update architecture diagrams:

1. Open `docs/diagramas/Diagramas.drawio` in DrawIO (draw.io)
2. Edit the relevant page/tab
3. Export as PNG to `docs/diagramas/` directory
4. Ensure PNG filenames match references in README.md

## Project Context

This is an academic proposal for a 6.5-month implementation plan. The documentation emphasizes:

- Reducing average service time from 35 to 12 minutes (65% reduction)
- Decreasing document rework from 18% to under 5%
- Improving NPS from 70 to 90
- Increasing lead-to-client conversion from 22% to 38%
