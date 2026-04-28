---
status: review
feature: sprint-4-multi-agent
created: 2026-04-27
---
# Sprint 4 PR — six-pass review

PR scope: `main..sprint/4` — 24 commits, 204 files, +14,825 / −6,742 LOC.
Spec: [[spec.md]].
Reviewer: Claude (post-implementation, post-recording, pre-merge).

Each pass uses a different lens to avoid repeating findings. Severity tags:
- **🔴 blocker** — must fix before declaring sprint shipped
- **🟡 sev-2** — should fix this sprint, will hurt later if left
- **🟢 sev-3** — nice to have / paper cut / cleanup

---

## Pass 1 — Spec compliance (8 briefing reqs + hard constraints)

Lens: every numbered requirement in `spec.md` mapped to evidence in code or docs. Missing
evidence is a finding.

### 8 briefing requirements

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Multi-agent orchestration | ✓ | `app/agent/src/agents/{input-filter,intent-classifier,entity-extractor,lookup,response-generator,output-filter}.ts` — 6 agents, each in its own file. `agent_trace[]` in `interaction_logs` records ≥6 steps. |
| 2 | Explicit intent classification | ✓ | `agents/intent-classifier.ts` returns `{intent, confidence}` validated by Zod against `INTENTS` (8 labels). Portal interaction-history shows the intent label per user message. |
| 3 | Explicit entity extraction | ✓ | `agents/entity-extractor.ts` covers visa_type, country, process_id, doc_type, email, dates. Spec asked for "at least one extracted value when present" — met. |
| 4 | Structured interaction logs | ✓ | `app/api/src/models/interaction-log.model.ts` schema has session_id, user_id, conversation_id, channel, user_message, intent, intent_confidence, entities, agent_trace[], response, response_skipped, total_latency_ms, created_at. Persistence in `pipeline.ts` after every run. |
| 5 | Modular service architecture | ✓ | docker-compose.yml: mongo, minio, minio-init, api, validation, agent, frontend (7 services; 5 long-running excluding init). |
| 6 | Few-shot examples | ✓ | intent prompt: 10 examples (`prompts/intent.ts`). entity prompt: 7 (`prompts/entity.ts`). response prompt: 8 examples by intent (`prompts/response.ts:131-153`). All ≥3. |
| 7 | Prompt injection protection | ✓ | `agents/input-filter.ts` — 6 regex patterns (instruction_override, role_override, system_role_attempt, extraction_attempt, fake_role_tags) + length cap 1000. Pipeline short-circuits in `pipeline.ts:110-122`, no LLM call, logs `intent: 'injection_attempt'`. |
| 8 | UCD customer portal | ✓ | `app/frontend/src/app/portal/[token]/page.tsx` — JWT-gated. Components: TimelineCard, NextStepsPanel, InteractionHistory, DocumentsList, ActionButtons. Mobile responsive (Tailwind viewport meta in layout). |

### Hard constraints

| # | Constraint | Status | Notes |
|---|---|---|---|
| 1 | All services run via `docker compose up` | ✓ | All 7 services local-only. |
| 2 | All AI uses Claude Agent SDK | ⚠️ | The agent service (`@anthropic-ai/claude-agent-sdk`) is used for every LLM call — except `app/agent/src/classifier/claude-vision.ts`, which calls `https://api.anthropic.com/v1/messages` directly via `fetch` because the SDK has no multimodal support as of v0.2.x. Documented in code comment + a learning note. **🟢 sev-3:** spec language is strict ("All new AI code uses @anthropic-ai/claude-agent-sdk"). Acceptable in practice but worth surfacing in the README's "Architectural Decisions" so the FIAP reviewer doesn't flag it. |
| 3 | JWT scoped to single user_id, ≤24h | ✓ | `lib/jwt.ts` uses HS256, payload only carries `user_id`, TTL from `PORTAL_TTL_HOURS=24`. **🟢 sev-3 sub-finding:** the file-level `PORTAL_SECRET` length check requires ≥32 chars; the `.env` value is 64 hex chars (✓), but a co-developer who sets a shorter secret will see only `console.error` and a generic `notFound()`. No runtime error tying back to the misconfig. Worth a startup assertion. |
| 4 | Status notifications deterministic | ✓ | `app/api/src/services/status-notifier.service.ts` uses templates, no LLM. Verified against `context/learnings/status-notifications-deterministic.md`. |
| 5 | Handoff: bot silent when transferred | ✓ | `pipeline.ts:91-103` short-circuits when `conv.status === 'transferred'`, logs as `intent: 'transferred'` with `response_skipped: true`. |
| 6 | FSM transitions validated in repo | ✓ | `app/api/src/repositories/process.repository.ts` validates against `VALID_TRANSITIONS`. |
| 7 | No regression of Sprint 2/3 | ✓ (mostly) | Smoke script `scripts/smoke-e2e.ts` covers 8 scenarios. **🟡 sev-2:** the legacy `app/n8n/`, `app/nlp/`, `app/classifier/` and `infra/` directories were removed (`e76774f`). README should explicitly list what was removed and why. |
| 8 | README documents architectural decisions | ⚠️ | `docs/RELATORIO_SPRINT_4.md` is the 1-2 page deliverable; it's good. **🟡 sev-2:** the `README.md` itself wasn't checked — needs verification it has the "Sprint 4 — Architectural Decisions" section the spec demands. |

### Deliverable artifacts

| Item | Status |
|---|---|
| `docs/RELATORIO_SPRINT_4.md` (1-2 page) | ✓ exists, 99 lines |
| `docs/DEMO_SPRINT_4.md` | ✓ exists, 121 lines |
| `docs/DEV_SETUP.md` | ✓ exists, 104 lines |
| Updated diagrams | ❓ **🟡 sev-2:** spec required `docs/diagramas/Diagramas.drawio` updated for Sprint 4 with PNGs re-exported. Must check. |
| `docs/demo-sprint-4.mp4` | ✓ 11 MB, 168s, real Telegram Web |

### Pass 1 findings

- **🟢 P1-1**: `claude-vision.ts` bypasses the SDK (uses raw fetch) — document this exception in the README/RELATORIO so the briefing's "all AI uses Claude SDK" statement isn't trivially falsifiable by `grep`.
- **🟢 P1-2**: PORTAL_SECRET length is asserted in the verifier path only; a server-startup assertion in the agent (where tokens are signed) would fail-fast on misconfiguration.
- **🟡 P1-3**: README and Diagramas.drawio status unverified — Pass 6 will close.
- **🟡 P1-4**: `RELATORIO_SPRINT_4.md` should mention the removed services (n8n, nlp, classifier Lambdas, AWS deploy scripts) and why.

---

## Pass 2 — Code quality (types, error handling, DRY/YAGNI, dead code)

Lens: would I be happy maintaining this code in 6 months? Type safety, null handling,
duplication, dead code, layering.

### Findings

- **🔴 P2-1 — Type-check fails on every Node app.** Spec verification step says
  *"`npm run type-check` passes in `app/api/`, `app/agent/`, `app/frontend/`"*. Reality:
  - `app/api`: 70+ errors. `LoggerConfig extends winston.createLogger` (line 6 of
    `config/logger.config.ts`) — `winston.createLogger` is a **function**, not a class;
    extending it loses all method types. Every `.info` / `.warn` / `.error` call across
    8+ files is a TS error. Pre-existing (commit `ba420dd`), but the spec made
    fixing it part of Sprint 4. Plus `vitest` types missing because devDeps include
    `vitest` but `tsconfig` doesn't include `tests/**/*` properly.
  - `app/agent`: rootDir error. `tsconfig.json` includes `tests/**/*` but `rootDir`
    is `src/`. TS 5+ stricter about this. Easy fix: drop tests from `include` and
    rely on vitest's own config.
  - `app/frontend`: 1 error in `src/lib/jwt.ts:20` — `payload as PortalTokenPayload`
    needs `as unknown as PortalTokenPayload` because `JWTPayload`'s index type doesn't
    overlap. Also: **no `type-check` script in `package.json`** (only `dev`, `build`,
    `start`, `lint`).

  Severity: 🔴 because the spec calls this out as a verification gate. The system
  works at runtime, but the contract was "type-check passes."

- **🟡 P2-2 — One test failure in `tests/unit/jwt.test.ts:18`.** "should reject a
  tampered signature" — the test flips the last char of the signature; in the seed
  used, the flipped char happens to land on a valid base64 alternative that produces
  a *different but still cryptographically valid* signature only if the secret is
  reused. More likely: the JOSE library is permissive about base64url padding and
  the flipped char doesn't actually corrupt the HMAC. Test is fragile. Either replace
  with a deterministic mutation (XOR a middle byte) or skip that case.
  `36/37 tests pass`.

- **🟡 P2-3 — Three recording scripts in `scripts/`, two are dead code.** After v2-tg
  shipped, `scripts/record-demo.mjs` (v1 simulator-based) and `scripts/record-demo-v2.mjs`
  (v2 simulator-with-polish, never used as final) are unused. They got committed in
  `cd9a53d` "for fallback" but a fallback that's never tested rots fast. Remove or
  add a README banner explaining the relationship.

- **🟡 P2-4 — `(guidance as any)` in two spots in `response.ts`.** The visa-guidance
  JSON is statically typed-friendly (constant key set: `recebido`, `em_analise`, ...).
  Define a `VisaStatusGuidance` interface and import `guidance` as
  `Record<ProcessStatus, VisaStatusGuidance>`. Removes type erasure and gives autocomplete
  for `g.next_steps`, `g.general_info`.

- **🟡 P2-5 — `lookup.ts` uses `any[]` for processes/documents.** `app/agent/src/agents/lookup.ts:5-6,22-23`.
  Mongoose types are imported elsewhere; just type these as `Process[]` / `File[]`. Same
  fix elsewhere with `as unknown as Record<...>`.

- **🟢 P2-6 — `pipeline.ts` runs intent + entity in parallel, but they share a `tracer`.**
  The Tracer's `push()` is not synchronized; concurrent appends to a JS array are safe
  (single-threaded event loop), but the order in `agent_trace[]` becomes timing-dependent.
  Not a bug; just a subtle property worth a comment in the file's header.

- **🟢 P2-7 — `persistInteractionLog` swallows errors silently.** `pipeline.ts:54-58`
  catches and logs as warn. Fine for the user's response path, but if the API is
  down for hours, no signal escalates. Consider a simple in-process counter +
  health-check threshold.

- **🟢 P2-8 — No structured error types.** Catches use `(err as Error).message` patterns.
  Fine for an academic project; for a real product, define `ApiError`, `AuthError`,
  `ValidationError` and let the type system route them.

- **🟢 P2-9 — Stray `console.error/warn` in frontend `jwt.ts` and `lib/api.ts`.** Frontend
  uses `console.*` in 4 places. The console is fine for SSR boundaries that have no
  logger, but for consistency consider a thin `lib/logger.ts` wrapper.

- **🟢 P2-10 — No TODO/FIXME debt anywhere.** `grep -r "TODO|FIXME|XXX|HACK"` across
  src trees → 0 hits. Surprising given the rapid iteration. Either the team is
  disciplined or the comments live in commit messages. Either way, clean signal.

- **🟢 P2-11 — `seed-demo.ts` (legacy fixture seeder, TG_ID=900_001_001 = "Maria")
  vs `seed-demo-from-tg.ts` (real-user seeder).** Both committed. Maria-fixture is
  used by the v1/v2-simulator scripts (which are now dead — see P2-3). After
  removing those, `seed-demo.ts` becomes orphan too.


---

## Pass 3 — Security (auth, secrets, prompt injection, IDOR, headers)

Lens: assume an attacker with knowledge of the local URL and a legitimate portal token.
What can they do that they shouldn't?

### Findings

- **🔴 P3-1 — IDOR on portal handoff action.** `app/frontend/src/app/portal/[token]/actions.ts:5-8`:
  ```ts
  export async function requestHandoff(conversationId: string): Promise<boolean> {
    const result = await updateConversation(conversationId, { status: "transferred" });
    return result !== null;
  }
  ```
  The action accepts a `conversationId` from the client and updates it without
  verifying it belongs to the JWT-authenticated user. Anyone holding a valid
  portal token (their own) can pass *any* `conversation_id` and force a
  transfer on someone else's chat — silencing another customer's bot.
  Spec Hard Constraint 3 says "the customer portal must not expose another
  customer's data"; a write IDOR violates the intent.

  **Fix:** the action should re-verify the JWT (already in the cookie/URL) and
  call `await getConversation(id)`, asserting `conversation.user_id === payload.user_id`
  before mutating.

- **🔴 P3-2 — Telegram webhook is unauthenticated.** Anyone who guesses or scrapes
  the ngrok URL can POST a forged Telegram update to `/telegram/webhook`. The
  payload schema is validated by Zod, but a forged update with a real-looking
  `from.id` and `message.text` would run the full multi-agent pipeline (4 LLM
  calls per message) on the attacker's behalf. They can:
  - **drain Claude rate limits** (we already saw 429s with a single user),
  - **pollute interaction_logs** with fake conversations,
  - **trigger handoffs** under any `chat_id` (the bot won't reply because that
    chat_id has no real Telegram chat, but the conversation row gets created).
  Telegram supports `secret_token` on `setWebhook`; the hook then arrives with
  `X-Telegram-Bot-Api-Secret-Token: <secret>` and we should reject any request
  missing it. Documented at <https://core.telegram.org/bots/api#setwebhook>.

  Risk is highest during the demo recording (ngrok URL is in screenshots / commit
  metadata). Severity 🔴 because it's an exposed surface in the same repo where
  the README lists the bot username publicly.

- **🟡 P3-3 — `API_KEY=fiap-iatron` is a low-entropy hardcoded default.** The
  agent service, frontend, and several scripts fall back to this literal string
  if the env var isn't set (`app/frontend/src/lib/api.ts:2`,
  `scripts/seed-demo-from-tg.ts:14`, etc.). For a local-only project this is
  acceptable, but the same key is also the only auth on `/users`, `/processes`,
  `/conversations`, `/files`, `/messages`, `/interactions` — a mostly-public bus.
  Replace the fallback with a build-time error and document the value in
  `.env.example` only.

- **🟡 P3-4 — Wide-open CORS on `/demo/*`.** `app/agent/src/server.ts:27`:
  `app.use('/demo/*', cors({ origin: '*' }))`. The `/demo/send` endpoint runs the
  pipeline (and burns Claude tokens) for any caller. If the demo simulator is
  truly retired (we now use real Telegram), the route shouldn't accept requests
  from arbitrary origins. Tighten to `http://localhost:3010` and `http://localhost:3000`.

- **🟡 P3-5 — Portal token travels in the URL path.** `/portal/<JWT>` puts the
  token in browser history, server access logs, Referer headers when the user
  clicks any external link. JWT is short-lived (24h) which mitigates, but a
  cookie-based session (`Set-Cookie: youvisa_portal=<jwt>; HttpOnly; SameSite=Lax`)
  with the URL pointing to `/portal/me` would be cleaner. For Sprint 4 it's
  acceptable; flag as a future hardening.

- **🟡 P3-6 — No rate limit on `/telegram/webhook` or `/demo/send`.** Combined
  with P3-2, an unauthenticated attacker can flood the agent with traffic and
  exhaust Claude tokens or DDoS Mongo writes. `@fastify/rate-limit` (api) and
  Hono's `rateLimiter` middleware (agent) are 5-line drop-ins.

- **🟢 P3-7 — `.env` working tree contains a real Telegram bot token.** Correctly
  gitignored, but a `git stash --include-untracked` plus a careless push could
  expose it. The `TELEGRAM_BOT_TOKEN_DEMO=...` value pattern from zeno-agent
  separates demo bots from prod for exactly this reason.

- **🟢 P3-8 — `N8N_BASIC_AUTH_PASSWORD=change_this_password` in `.env`.** n8n
  is removed from the project (`e76774f`), but the env var is still present.
  Cosmetic.

- **🟢 P3-9 — `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID` in `.env`.** Sprint
  4 dropped AWS dependence; remove from `.env` and `.env.example`.

- **🟢 P3-10 — JWT signing uses `setIssuedAt()` but verifier doesn't enforce
  `iat` skew tolerance.** With `clockTolerance` left at default (0), a clock
  drift between the agent (signer) and frontend (verifier) of 30s could fail.
  Both run in the same Docker network so unlikely, but worth setting
  `{clockTolerance: '30s'}` to be explicit.

- **🟢 P3-11 — No prompt-injection patterns for the **Portuguese** "ignore all
  previous **system messages**" variant.** Current patterns catch
  `(?:rules|instructions|prompt|regras|instru[çc][õo]es)` but miss
  "mensagens", "regras anteriores", "diretrizes". Worth one more regex.

- **🟢 P3-12 — Defense in depth on portal: `proxy.ts` matcher excludes `/portal/*`.**
  The portal page does its own JWT verify, which is fine. But a defense-in-depth
  middleware check (reject malformed JWT structurally before page render) saves
  a server roundtrip. Optional.

- **🟢 P3-13 — Output filter has no XSS surface for portal because messages are
  rendered as `{text}` in JSX (auto-escaped).** Verified `interaction-history.tsx`
  uses `{log.user_message}` not `dangerouslySetInnerHTML`. ✓


---

## Pass 4 — UX / UI / Accessibility (portal + console)

Lens: open the portal on a phone and a screen-reader. What breaks the experience?
Spec briefing item 8 demands "User-Centered Design"; verifying that means more than
"it renders".

### Findings

- **🟡 P4-1 — Touch targets below 44 px on mobile.** `components/ui/button.tsx`
  exposes `default: h-9` (36 px), `lg: h-10` (40 px), `sm: h-8` (32 px). Apple HIG
  + Material Design require ≥ 44 px / 48 dp; WCAG 2.5.8 makes 24 px the AA floor
  but 44 px is the recognized comfort minimum. The portal's primary CTA "Falar
  com atendente" (`action-buttons.tsx`) uses default → 36 px on mobile. Bump
  the portal CTAs to a `lg`-equivalent that's actually ≥ 44 px (e.g. `h-11`).

- **🟡 P4-2 — No `<main>` landmark or skip-link on the portal.** Page renders
  inside `<main>` only on the expired-token branch. The successful branch wraps
  in `<div className="min-h-screen ...">` — screen-reader users hit the entire
  navigation chrome before content. Add `<main>` and a "skip to main" link. (The
  `lang="pt-BR"` on `<html>` is correctly set.)

- **🟡 P4-3 — Status pill conveys meaning by color alone.** `globals.css`
  `.status-pill` uses red/amber/blue/green/slate per status; the label text is
  the same shape (single word). For colorblind users, "Em Análise" (blue) and
  "Pendente de Documentos" (amber) read alike if labels truncate. Add an icon
  inside the pill (clock for em_analise, exclamation for pendente, check for
  aprovado, etc.) so meaning isn't color-only — WCAG 1.4.1.

- **🟡 P4-4 — Loading state uses an unlabeled spinner.** `app/portal/[token]/loading.tsx`:
  the `animate-spin` div has no `role="status"` / `aria-live`. Screen readers
  announce nothing during the (often slow) data fetch. Wrap with
  `<div role="status" aria-live="polite">` and add `<span className="sr-only">
  Carregando…</span>` so the existing visible text is also announced.

- **🟡 P4-5 — Operator console "Voltar para Bot" button has no confirmation.**
  Single click flips a customer's conversation to `active`; if the operator
  misclicks, there's no undo. Apple HIG / Material recommend a confirmation
  step (or an undo toast) for any action with cross-customer side effects.
  Recording captured a successful click; it didn't capture a misclick scenario.

- **🟡 P4-6 — Frontend has zero `<img>` or `next/image`.** Spec scenario 8 says
  "documents list (with **thumbnail from MinIO**)". Scanned `documents-list.tsx`
  — it renders filename + tag pill, no thumbnail. Either the spec wording is
  aspirational, or the thumbnail is silently missing. Rendering even a
  type-icon (📄 vs 🛂) would help comprehension and is cheap.

- **🟢 P4-7 — Portal inteligence-history shows intent labels next to user
  messages.** ✓ matches spec scenario 8 exactly. Nice touch, hard to find a
  flaw.

- **🟢 P4-8 — Closing card on the demo video cuts to black abruptly.**
  Watching frame 168s vs 167s, the title card fades out *as* the recording
  ends — there's no breathing room. Adding a 1-second hold on a clean
  background after the title fade-out would improve professional polish.

- **🟢 P4-9 — Caption banner during recording obscures the top header bar in
  some scenes.** E.g., frame at 80s puts "Logs de interação · agent_trace"
  directly over the "YOUVISA CONSOLE" branding. For interpretability the
  banner could shift to bottom-center when an app header is present, or use
  a translucent backdrop so the brand stays partly visible.

- **🟢 P4-10 — Step badge stays visible across page navigations.**
  `stepBadge(page, 1, 5, 'Telegram')` stays at "Telegram" even after the
  scene moved to the operator console — `stepBadge` mutates the same element
  so the next call replaces, but between calls the stale label persists.
  Cosmetic only; not visible in v3 because each ACT calls stepBadge first.

- **🟢 P4-11 — Old `[data-nextjs-toast]` etc. CSS hide list in `demo-helpers.mjs`
  works but doesn't cover Turbopack's `nextjs-portal` overlay introduced in
  Next 16 alpha.** Recording frames don't show any leak so it's holding, but
  a future Next bump could break it. Keep an eye.

- **🟢 P4-12 — No dark-mode preference detection on the portal landing.** The
  `<ThemeToggle/>` exists in dashboard headers but the portal page omits it.
  The existing CSS supports `dark:`; just inherit the theme provider, no extra
  work needed.


---

## Pass 5 — Performance & observability

Lens: latency budget, query patterns, log signal, traces, cost.

### Findings

- **🔴 P5-1 — Portal fetches `getFiles()` and `getConversations()` UNFILTERED.**
  `app/frontend/src/app/portal/[token]/page.tsx:43-50`:
  ```ts
  const [user, processes, files, interactionLogs, guidance, conversations] = await Promise.all([
    getUser(payload.user_id),
    getProcesses({ user_id: payload.user_id }),
    getFiles().then((all) => all),                     // ← every file in DB
    getInteractionLogsByUser(payload.user_id),
    getVisaGuidance(),
    getConversations(),                                // ← every conversation in DB
  ]);
  // then filters client-side using user_id
  ```
  This pulls **every other customer's** files and conversations to the portal,
  filtered client-side. Two problems:
  1. **Privacy regression:** the client receives data it shouldn't, even if it
     filters before render. Anyone inspecting the network tab sees all file
     metadata. This *is* the spec's "must not expose another customer's data"
     constraint failing — same severity bucket as P3-1.
  2. **O(N) per page load** — fine at 100 files, dies at 100k. The API already
     accepts `?conversation_id` and `?user_id` filters; portal should use them.

- **🟡 P5-2 — No prompt caching on the system prompt.** Each pipeline call sends
  the full system prompt (intent: ~2 KB, response: ~5 KB with examples + guidance).
  Anthropic's prompt caching (`cache_control: { type: 'ephemeral' }` on the
  system block) would slash latency and cost by ~80% for repeat calls within
  5 min. The Claude SDK supports it; the response generator is the obvious
  candidate (largest prompt). Worth one PR.

- **🟡 P5-3 — Two logger ecosystems coexist.** Agent uses `pino` (`lib/logger.ts`),
  API uses `winston` (`config/logger.config.ts`). Frontend uses `console.*`.
  Three patterns means three places to wire up tracing in the future. Pick one
  per process boundary; pino is leaner and JSON-first which is what the agent
  benefits from. Migrating the API is a 1-day chore but keeps that for a
  later sprint.

- **🟡 P5-4 — No request-id / correlation-id traversal.** A user message goes:
  Telegram → ngrok → agent (`telegram-webhook`) → api (`/users/upsert`,
  `/conversations/upsert`, `/interactions`) → response back. Each hop logs
  separately with its own timestamp. Adding a `x-request-id` header propagated
  through the api-client and surfaced in `agent_trace` would let a single ID
  tie all logs together. Currently you have to grep by user_id + 60s window.

- **🟡 P5-5 — `entity-extractor` runs on EVERY message, including
  `general` and `injection_attempt`.** `pipeline.ts:124-128` runs intent + entity
  in parallel always (good for latency), but if the message gets blocked by the
  input filter, neither is run (good). However, for messages classified as
  `general` ("oi tudo bem?") we still spend ~10 s and Claude tokens on entity
  extraction with nothing to extract. Either:
  - Run entity extraction only when intent ∈ {status_query, document_question,
    open_portal, provide_email}, or
  - Move to a single-call combined classifier (intent+entities together) — but
    that re-merges the multi-agent split that the briefing wants visible. Best
    option: keep the split, but add a fast pre-check that skips entity for
    `general`/`want_human` once intent is known. Sequential cost: +200 ms; saves
    ~10 s per simple message.

- **🟡 P5-6 — Mongo index coverage is good but `interaction_logs` lacks a
  compound index for the most common query.** Schema indexes individual fields
  (`session_id`, `user_id`, `conversation_id`, `intent`). The portal queries
  `getInteractionLogsByUser(user_id)` ordered by `created_at desc` — needs
  `{user_id: 1, created_at: -1}` compound to avoid in-memory sort. Same for the
  operator console's interactions page (sort by `-created_at`).

- **🟢 P5-7 — Frontend portal uses `Promise.all` for the 6 fetches.** ✓ Good.

- **🟢 P5-8 — Pipeline runs intent + entity in parallel.** ✓ ~50% wall-time
  saved on every message.

- **🟢 P5-9 — `agent_trace[]` records duration_ms per step.** Correctly captured
  in `tracer.run()`. The Sprint 4 demo shows real numbers (intent 8312 ms,
  entity 13058 ms, response 8492 ms). This *is* the observability the spec
  asked for — operator can see a slow step from the console.

- **🟢 P5-10 — No `/metrics` endpoint, no Prometheus, no APM.** Acceptable for
  an academic project. Don't add. Note for future productionization.

- **🟢 P5-11 — `ConversationModel().findById(...).lean()` used pre-pipeline.** ✓
  Lean queries skip Mongoose hydration; correct choice for a hot path.

- **🟢 P5-12 — `persistInteractionLog` is awaited at the end of pipeline.** Adds
  ~30 ms to user-perceived response time (it's after the Telegram send in
  `telegram-webhook.ts`?). Worth verifying — if it's blocking the webhook
  response back to Telegram, fire-and-forget would cut p99. Quick check needed.

- **🟢 P5-13 — Bot reply latency in the demo recording averages 12-15 s.**
  Driven by Claude Haiku response time + the parallel intent/entity (slowest
  wins). Could drop to ~6-8 s with prompt caching (P5-2) and skip-on-general
  (P5-5). For a demo this is fine; for a real product the experience needs
  optimistic UI ("digitando…") to feel responsive. Telegram already shows
  typing indicators if we send `sendChatAction`; we're not.


---

## Pass 6 — Operations & repeatability (Docker, scripts, docs, demo)

Lens: clone fresh, follow the docs, can a TA run this in 30 minutes? Are tests
honest? Are docs in sync with code?

### Findings

- **🔴 P6-1 — `make type-check` silently swallows failures with `|| true`.**
  `Makefile:type-check` runs `tsc --noEmit` and pipes through `|| true`, so the
  command always exits 0 even when there are 70+ TS errors. This is exactly
  what hid P2-1. Either remove `|| true` and fix the underlying types, or
  document a known-broken state. Right now the project *appears* to type-check
  while not actually doing so. Severity 🔴 because it makes the spec's
  verification step ("npm run type-check passes") **untruthful**.

- **🔴 P6-2 — `docs/diagramas/Diagramas.drawio` was not updated for Sprint 4.**
  Spec deliverable artifact: *"`docs/diagramas/Diagramas.drawio` updated with
  the Sprint 4 architecture; PNGs re-exported."* Reality: file mtime
  `Nov 27 18:05` (Sprint 3 era). PNGs same date. Spec has Mermaid fallback
  (one block in README — checked) so the deliverable is not entirely empty,
  but the .drawio source-of-truth still depicts the n8n-era architecture.
  Either update the .drawio or explicitly mark it deprecated and point to the
  Mermaid block. Severity 🔴 because it's a named artifact in success criteria.

- **🔴 P6-3 — `docs/DEMO_SPRINT_4.md` is out of date.** Documents the manual
  pre-recording workflow (`ngrok http 7777`, `make webhook URL=...`), not the
  `scripts/setup-demo-v2.sh` + `scripts/run-demo-v2.sh` pipeline that we
  actually shipped (`cd9a53d`). A reviewer following the doc would set up a
  parallel ngrok tunnel and miss the OAuth-token sync entirely (and then their
  classifier would fail per [[../../learnings/claude-vision-oauth-token-refresh]]).
  Update this doc to point at `bash scripts/setup-demo-v2.sh` + `bash scripts/run-demo-v2.sh`.

- **🟡 P6-4 — `make smoke` calls `smoke-pipeline.ts` but spec references
  `scripts/smoke-e2e.ts`.** Two different smoke surfaces exist:
  - `app/agent/src/scripts/smoke-pipeline.ts` (in-container, agent-only)
  - `scripts/smoke-e2e.ts` (host-side, full E2E)
  The Makefile only wires the first. The spec demands the E2E one passes as
  part of verification. Add `make smoke-e2e` target or merge.

- **🟡 P6-5 — Frontend has no `type-check` script.** `app/frontend/package.json`
  scripts: `dev`, `build`, `start`, `lint`. No `type-check`. The spec demanded
  it pass in `app/frontend/`. Add `"type-check": "tsc --noEmit"` and wire it
  in the root Makefile.

- **🟡 P6-6 — Three recording scripts and two seed scripts in `scripts/`,
  unclear which is canonical.** Today's tree:
  ```
  scripts/record-demo.mjs            ← v1 simulator (legacy)
  scripts/record-demo-v2.mjs         ← v2 simulator with polish (never used as final)
  scripts/record-demo-v2-tg.mjs      ← v2 real Telegram (canonical, what shipped)
  scripts/seed-demo.ts               ← Maria-fixture (used by simulators)
  scripts/seed-demo-from-tg.ts       ← real-user seeder (canonical)
  ```
  None of the scripts has a header comment saying which is canonical and which
  is legacy. A maintainer looking at this in 6 months won't know. Either delete
  `record-demo.mjs`, `record-demo-v2.mjs`, `seed-demo.ts`, or rename them with
  a `legacy-` prefix.

- **🟡 P6-7 — `Makefile` has no `make demo` / `make record` target.** The new
  recording flow takes three commands (`bash scripts/setup-demo-v2.sh` …) that
  aren't in the Makefile. Either add `make record`, or document the bare-bash
  invocation explicitly in DEMO_SPRINT_4.md.

- **🟡 P6-8 — `claude_home` Docker volume requires manual `claude setup-token`
  on first boot.** `make claude-setup` exists, but:
  - it depends on `setup-demo-v2.sh` syncing the host's Keychain afterwards,
  - the ordering ("setup-token first, then sync, then never use setup-token
    again because it'd erase the synced creds") is not explained in
    `DEV_SETUP.md`.
  Add a clarifying section "Claude credentials: when to use which command".

- **🟢 P6-9 — `.env.example` is comprehensive and accurate.** ✓

- **🟢 P6-10 — `Makefile` has helpful `make help` listing.** ✓ Clean DX.

- **🟢 P6-11 — `docs/RELATORIO_SPRINT_4.md` is well-scoped (99 lines).** Hits the
  three required sections (organização dos agentes, interpretação das
  perguntas, registro das interações) inside the 1-2 page budget. ✓ Worth
  cross-checking that it explicitly mentions the SDK-bypass for vision
  (P1-1) so a FIAP reviewer doesn't think we cheated.

- **🟢 P6-12 — Scripts use `set -euo pipefail` and have clear stages.** ✓
  `setup-demo-v2.sh` has 1/4-2/4-3/4-4/4 stage headers and color output.
  Production-quality DX.

- **🟢 P6-13 — `docker-compose.yml` healthchecks on minio + validation, but not
  on api / agent / mongo.** Means `docker compose up --wait` won't actually
  wait for the API to be ready. Adding a `wget /health || exit 1` healthcheck
  to api and agent (both expose `/health`) closes the gap. Cosmetic.

- **🟢 P6-14 — Demo recording is checked into the repo (11 MB binary).** This
  is normal for an academic deliverable, but the repo grows fast as v1 (2.5 MB)
  is also still in git history. Consider git-lfs for `docs/*.mp4` if the repo
  size becomes a problem.

- **🟢 P6-15 — `tmp/scenes-v2/*.webm` and `docs/demo-sprint-4.webm` are
  correctly gitignored.** ✓

- **🟢 P6-16 — `scripts/run-demo-v2.sh` re-runs `setup-demo-v2.sh` on every
  invocation.** Idempotent, but means even local re-records hit the OAuth
  Keychain prompt on macOS. Consider a `--skip-setup` flag for inner-loop
  iteration.


---

## Consolidated summary

### Counts by severity

| Severity | Count |
|---|---|
| 🔴 blocker | **6** |
| 🟡 sev-2 | **22** |
| 🟢 sev-3 | **31** |
| **Total** | **59** |

### Blockers (must fix before declaring sprint shipped)

| ID | Pass | Title | Fix complexity |
|---|---|---|---|
| **P2-1** | code | Type-check fails on api / agent / frontend (LoggerConfig + rootDir + jwt cast + missing script) | Medium — winston extension is the heavy lift |
| **P3-1** | sec | IDOR on portal handoff action — no JWT-vs-conversation owner check | Small — ~10 lines in `actions.ts` |
| **P3-2** | sec | Telegram webhook is unauthenticated — anyone with the ngrok URL can drain Claude tokens | Small — `setWebhook?secret_token=...` + header check |
| **P5-1** | perf | Portal pulls ALL conversations + ALL files unfiltered → privacy regression | Small — pass `?user_id=` to existing API filters |
| **P6-1** | ops | `make type-check` uses `\|\| true`, hiding the spec-required type-check pass | Trivial — remove `\|\| true` (then fix what surfaces) |
| **P6-2** | ops | `Diagramas.drawio` not updated for Sprint 4 (still depicts n8n era) | Medium — manual draw.io work |
| **P6-3** | ops | `DEMO_SPRINT_4.md` documents OLD manual workflow, not the new scripts | Small — rewrite ~30 lines |

### Quickest wins (sev-2/3 with high return)

1. **`actions.ts` JWT-scope check** (closes P3-1 IDOR — biggest security hole).
2. **Tighten portal data fetches** (closes P5-1 — same root cause as P3-1).
3. **Add `setWebhook` secret token** (closes P3-2 — drains otherwise).
4. **Remove `|| true` from Makefile + add `tsc --noEmit` script to frontend** (closes P6-1, P6-5).
5. **Bump Button `default` to h-11 on portal CTAs** (closes P4-1 mobile touch).
6. **Compound index `{user_id, created_at: -1}` on `interaction_logs`** (closes P5-6).
7. **Delete `record-demo.mjs`, `record-demo-v2.mjs`, `seed-demo.ts`** (closes P2-3, P2-11, P6-6).
8. **Add few-shot prompt-cache annotation on response generator** (closes P5-2 — saves ~80% of tokens).
9. **`stale fixtures cleanup` in `seed-demo-from-tg.ts`** — currently re-creates the user record but doesn't reset `metadata.state`.
10. **Update DEMO_SPRINT_4.md** to point at `setup-demo-v2.sh` + `run-demo-v2.sh`.

### What I'd merge as-is anyway

The Sprint 4 deliverable **does work end-to-end** — every briefing requirement
has working code behind it, the demo video proves it on real Telegram against
real Claude, and the smoke script passes. The blockers above are *correctness
or polish gaps*, not "the system doesn't function" gaps. For an academic
sprint deliverable, my recommendation:

1. Fix **P3-1, P3-2, P5-1, P6-1, P6-2, P6-3** before merging to main (these
   are visible to a FIAP reviewer running through the artifacts).
2. Triage the rest into a "Sprint 5 backlog" note.
3. Then open the PR.

The **🟢 sev-3** findings are mostly small comments and wouldn't block release
even outside an academic context.

