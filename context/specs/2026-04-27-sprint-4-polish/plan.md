# Sprint 4 Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — run inline; this plan is small enough to keep in one context.

**Goal:** ship the 6 🔴 blockers + curated 🟡 sev-2 from [[../2026-04-26-sprint-4-multi-agent/pr-review.md]], then re-record the demo with more highlights and faster Telegram pacing.

**Architecture:** No new services. Surgical edits to existing files. The recording script gains 5 new spotlights and an idempotent webhook handler eliminates duplicates upstream.

**Tech Stack:** TypeScript (api + agent + frontend), Hono (agent), Fastify (api), Next.js 16, Playwright (recording), ffmpeg.

---

## Sequencing

Six phases, executed serially. Each phase ends with a commit. Phases share files
loosely so we go in dependency order:

1. **Security** — IDOR fix, webhook secret, dedup, portal data scoping.
2. **Type safety** — fix LoggerConfig, agent rootDir, frontend tsconfig + script, remove `|| true`.
3. **Performance** — prompt cache, conditional entity, compound index, typing indicator.
4. **A11y / UX** — `<main>`, skip-link, status pill icons, touch targets, confirm dialog.
5. **Docs + cleanup** — README mermaid, DEMO_SPRINT_4 rewrite, DEV_SETUP claude-creds section, RELATORIO note, drawio archive note, delete dead scripts, add `make record` + `make smoke-e2e`.
6. **Recording v3** — augment `record-demo-v2-tg.mjs` with 5 new highlights, zoom on injection pill / agent_trace timing / portal timeline / docs / JWT URL, tighten dwell times, run, verify.

A final phase 7 is "verify everything green" + commit notes update.

---

## Phase 1 — Security (commit: `fix(sec): close IDOR + add webhook auth + dedup + portal data scope`)

**Files:**
- Modify: `app/frontend/src/app/portal/[token]/actions.ts`
- Modify: `app/frontend/src/app/portal/[token]/page.tsx`
- Modify: `app/frontend/src/lib/api.ts` (add user_id filter passthrough)
- Modify: `app/agent/src/routes/telegram-webhook.ts`
- Create: `app/agent/src/lib/update-dedup.ts` (TTL Mongo cache for `update_id`)
- Modify: `app/agent/src/db/repositories/index.ts` (add ProcessedUpdateModel)
- Modify: `scripts/setup-demo-v2.sh` (generate + persist `TELEGRAM_WEBHOOK_SECRET`)
- Modify: `.env.example` (document new optional vars)

**Steps:**

- [ ] **1.1 IDOR fix in `actions.ts`** — verify the token from cookies/path matches conversation owner before mutating.
- [ ] **1.2 Portal data scoping** — pass `user_id` to `getConversations()` and `getFiles()` calls in `page.tsx`. Update API client to forward filter.
- [ ] **1.3 Webhook secret token** — read `TELEGRAM_WEBHOOK_SECRET` env, compare to `X-Telegram-Bot-Api-Secret-Token` header, 401 on mismatch.
- [ ] **1.4 update_id dedup** — Mongo collection `processed_updates` with TTL index `{processed_at: 1, expireAfterSeconds: 3600}` and unique on `update_id`. Insert-or-skip pattern; if duplicate, return 200 immediately without running pipeline.
- [ ] **1.5 setup-demo-v2.sh** — generate webhook secret if not set, persist to `.env`, register with Telegram via `setWebhook?secret_token=...`.

---

## Phase 2 — Type safety (commit: `fix(types): pass type-check across all node apps`)

**Files:**
- Modify: `app/api/src/config/logger.config.ts` (replace class-extends with factory)
- Modify: `app/api/tsconfig.json` (exclude `**/*.test.ts` from type-check)
- Modify: `app/agent/tsconfig.json` (drop `tests/**/*` from `include`)
- Modify: `app/frontend/package.json` (add `"type-check": "tsc --noEmit"`)
- Modify: `app/frontend/src/lib/jwt.ts` (cast via `as unknown`)
- Modify: `Makefile` (drop `|| true` from `type-check`, add frontend leg)

**Steps:**

- [ ] **2.1 LoggerConfig factory** — replace `class LoggerConfig extends winston.createLogger {...}` with a tsyringe-injected factory that returns `winston.Logger` (the actual type). Adjust DI registration in `container.ts`.
- [ ] **2.2 Agent tsconfig** — `include` becomes `["src/**/*"]`; tests are picked up by vitest config separately.
- [ ] **2.3 Frontend** — add `type-check` script + fix the JWT cast.
- [ ] **2.4 Makefile** — remove `|| true` from `make type-check`; add `cd app/frontend && npm run type-check`.

---

## Phase 3 — Performance (commit: `perf: prompt cache + conditional entity + compound index + typing indicator`)

**Files:**
- Modify: `app/agent/src/lib/claude.ts` (pass `cache_control` for system prompt)
- Modify: `app/agent/src/orchestrator/pipeline.ts` (gate entity extraction on intent)
- Modify: `app/api/src/models/interaction-log.model.ts` (compound index)
- Modify: `app/agent/src/routes/telegram-webhook.ts` (call `sendChatAction(typing)` early)
- Modify: `app/agent/src/agents/entity-extractor.ts` (export a `skipped` trace helper)
- Modify: `app/agent/src/orchestrator/types.ts` (extend AgentTrace step labels)

**Steps:**

- [ ] **3.1 Prompt caching** — add `cache_control: { type: 'ephemeral' }` to the response generator's system prompt. Verify cache hit metric on second message.
- [ ] **3.2 Conditional entity** — after intent classification, if intent ∈ {general, want_human, transferred, injection_attempt}, push a synthetic `entity-extractor` trace entry with `{skipped: true, reason: 'intent-not-eligible'}` and skip the LLM call.
- [ ] **3.3 Compound index** — add `interactionLogSchema.index({user_id: 1, created_at: -1})`.
- [ ] **3.4 Typing indicator** — call Telegram `sendChatAction(chat_id, 'typing')` immediately on webhook receipt (fire-and-forget, before the pipeline starts).

---

## Phase 4 — A11y / UX (commit: `feat(ux): a11y landmarks + status icons + 44px touch + handoff confirm`)

**Files:**
- Modify: `app/frontend/src/app/portal/[token]/page.tsx` (`<main>` + skip-link + h1)
- Modify: `app/frontend/src/app/portal/[token]/loading.tsx` (`role="status"`)
- Modify: `app/frontend/src/app/globals.css` (status-pill icon slot)
- Create: `app/frontend/src/components/portal/status-pill.tsx` (replaces inline `.status-pill` usage)
- Modify: `app/frontend/src/components/portal/timeline-card.tsx` (use new StatusPill)
- Modify: `app/frontend/src/components/portal/action-buttons.tsx` (h-11 buttons + confirm before handoff)
- Modify: `app/frontend/src/app/dashboard/conversations/page.tsx` (confirm dialog before "Voltar para Bot")
- Add: shadcn `alert-dialog` component if not already present.

**Steps:**

- [ ] **4.1 Portal landmark** — wrap content in `<main role="main" id="main">`, add a `<a href="#main" className="sr-only focus:not-sr-only">Pular para o conteúdo</a>` at top.
- [ ] **4.2 Loading spinner** — wrap div in `<div role="status" aria-live="polite">` with `<span className="sr-only">Carregando…</span>`.
- [ ] **4.3 Status pill with icon** — new component takes `status` prop, renders `{icon}{label}` so meaning isn't color-only. Icons: clock (em_analise), exclamation-triangle (pendente_documentos), check (aprovado), x (rejeitado), file-check (recebido), check-double (finalizado), x-circle (cancelado).
- [ ] **4.4 Touch targets** — set `className="h-11"` on portal CTAs; same on operator's "Voltar para Bot".
- [ ] **4.5 Confirm dialog** — shadcn AlertDialog before fire-and-forget handoff actions.

---

## Phase 5 — Docs + cleanup (commit: `docs: align README/DEMO/RELATORIO + delete dead recording scripts`)

**Files:**
- Modify: `README.md` (Mermaid block reflecting Sprint 4)
- Modify: `docs/DEMO_SPRINT_4.md` (point at `setup-demo-v2.sh` + `run-demo-v2.sh`)
- Modify: `docs/DEV_SETUP.md` (Claude creds lifecycle section)
- Modify: `docs/RELATORIO_SPRINT_4.md` (claude-vision SDK-bypass note)
- Delete: `scripts/record-demo.mjs`
- Delete: `scripts/record-demo-v2.mjs`
- Delete: `scripts/seed-demo.ts`
- Modify: `Makefile` (`make record`, `make smoke-e2e`, drop dead targets)
- Modify: `docs/diagramas/Diagramas.drawio` (banner note pointing at Mermaid)

**Steps:**

- [ ] **5.1 README mermaid** — replace n8n-era diagram with Sprint 4 topology.
- [ ] **5.2 DEMO_SPRINT_4** — rewrite "Pré-gravação" section to call the scripts.
- [ ] **5.3 DEV_SETUP** — append "Claude credentials lifecycle".
- [ ] **5.4 Delete dead** — `git rm` the three legacy scripts.
- [ ] **5.5 Makefile** — `make record` runs `bash scripts/run-demo-v2.sh`; `make smoke-e2e` runs `npx tsx scripts/smoke-e2e.ts`.
- [ ] **5.6 Drawio** — add a comment node at the top: "Sprint 3 archive. Sprint 4 architecture lives in README.md (Mermaid)."

---

## Phase 6 — Recording v3 (commit: `feat(demo): v3 recording with 7+ highlights and tightened pacing`)

**Files:**
- Modify: `scripts/record-demo-v2-tg.mjs`
- Modify: `scripts/demo-helpers.mjs` (add `zoomBubble` helper for telegram bubbles)

**Steps:**

- [ ] **6.1 Tighten pacing** — reduce inter-scene `waitForTimeout` from 2400 ms to 700-1200 ms where the caption-fade allows.
- [ ] **6.2 Add highlight: injection pill** — after Q2 (prompt injection) sends, navigate briefly to `/dashboard/interactions`, zoomIn on the red "Injeção bloqueada" badge for 3 s before continuing.
- [ ] **6.3 Add highlight: agent_trace timing** — when on interactions page, zoomIn on the duration_ms numbers (the `data-trace-timing` attr we'll add to the pills).
- [ ] **6.4 Add highlight: status badge change** — spotlight on "Status Atual" in process detail when changed.
- [ ] **6.5 Add highlight: notification arrival** — zoomIn on the new Telegram bubble when auto-notification lands.
- [ ] **6.6 Add highlight: portal timeline + documents** — two separate spotlights (timeline, documents card) instead of just the page-level caption.
- [ ] **6.7 Add highlight: JWT URL bubble** — zoomIn on the bot's portal-link bubble before navigating away.
- [ ] **6.8 Eliminate duplicate visual** — the existing duplicate-bubble issue should be gone after Phase 1.4 (dedup); verify in the recording.

---

## Phase 7 — Verify (no commit, just gate)

- [ ] `make type-check` exits 0 (without `|| true`).
- [ ] `make test` exits 0.
- [ ] `make smoke-e2e` exits 0.
- [ ] `bash scripts/run-demo-v2.sh` produces a 150–180 s mp4 with ≥ 7 highlights.
- [ ] Manual check: 5 keyframes (30s/60s/90s/120s/150s) — no duplicate bot replies.

Then create commits per phase, push, summarize for the user.
