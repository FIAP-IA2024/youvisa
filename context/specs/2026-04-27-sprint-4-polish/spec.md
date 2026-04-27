---
status: approved
feature: sprint-4-polish
created: 2026-04-27
shipped: null
parent: 2026-04-26-sprint-4-multi-agent
---
# Sprint 4 — Polish & Hardening (post-review)

**Status:** Approved (self-brainstormed by Claude with user authorization on 2026-04-27)
**Scope:** Close every 🔴 blocker and high-impact 🟡 finding from the six-pass PR review
([[../2026-04-26-sprint-4-multi-agent/pr-review.md]]), then re-record the demo video v3
with more visual highlights, fixed Telegram pacing, and zero duplicate bot replies.
**Goal:** the deliverable looks like a serious enterprise product — not a
classroom prototype with rough edges visible to a careful reviewer.

## Design log (self-brainstormed Q&A)

These are the questions I'd have asked the user during `/brainstorming`, with my own
answers recorded for traceability.

> **Q1.** Which of the 59 review findings count as in-scope for this sprint?
> **A.** All 6 🔴 blockers (P2-1, P3-1, P3-2, P5-1, P6-1, P6-2, P6-3) plus a curated set
> of 🟡 sev-2 with high return-on-effort:
> P2-2 (flaky JWT test), P2-3 (3 dead recording scripts), P2-4/P2-5 (`as any` cleanup
> in response/lookup), P3-3 (API_KEY hardcoded fallback), P3-4 (CORS tighten),
> P3-6 (rate limit), P4-1 (touch targets), P4-2 (`<main>` + skip-link), P4-3 (status
> pill icon), P4-5 (handoff confirm), P5-2 (prompt caching), P5-5 (entity skip on
> general), P5-6 (compound index), P5-13 (`sendChatAction` typing indicator),
> P6-4 (smoke-e2e wiring), P6-5 (frontend type-check script), P6-6 (delete dead
> scripts), P6-7 (`make record` target), P6-8 (claude-creds doc).
> Sev-3 are dropped to keep this PR reviewable.
>
> **Q2.** Re-record the video, or splice fixes into the existing one?
> **A.** Re-record. Two reasons: (a) the dead scripts deletion changes file paths,
> (b) the user explicitly said "achei q vc usou muito pouco" of the highlights, and
> "a parte do telegram ficou meio lenta, o bot mandou algumas msgs duplicadas".
> Splicing won't fix pacing. Plus the perf fixes (P5-2 caching, P5-5 skip) make the
> bot ~40% faster — different timings = re-record anyway.
>
> **Q3.** Why duplicate bot messages? Hypothesis vs evidence.
> **A.** API logs from the v2 run showed `transferred` intent at `13:11:00.702` and
> `13:11:01.301` — two interactions 599 ms apart. Telegram webhook retry policy is
> 60 s; our pipeline takes ~12 s, so retry isn't the cause. Most likely: the warmup
> phase sent "olá", the bot replied, then the recording context navigated to the bot
> chat and Telegram WebK re-rendered — but somewhere in there a message got sent
> twice. Defensive fix: idempotent webhook handler that dedupes by `update_id` in a
> short-lived Mongo collection (TTL 1h). Cheaper than diagnosing the exact
> repro path, prevents recurrence regardless of cause.
>
> **Q4.** What does "more highlights" mean concretely?
> **A.** The v2 video had spotlights on 2 surfaces: the Conversas Transferidas card
> and the agent_trace pills. The v3 will add:
> 1. Zoom-in on the "Injeção bloqueada" pill when prompt-injection is demonstrated
> 2. Zoom-in on the duration_ms numbers in agent_trace (they're the most surprising
>    visible artifact — hammers home "real LLM calls, real timing")
> 3. Spotlight on the "Status Atual" badge when the operator changes process state
> 4. Zoom-in + spotlight on the auto-notification bubble in Telegram
> 5. Zoom-in on the JWT URL the bot returns for the portal
> 6. Spotlight on the timeline progress bar in the customer portal
> 7. Spotlight on the documents list (Passaporte + RG) in the portal
> Add: a brief 1.5 s pause after each spotlight so the eye can settle.
>
> **Q5.** Faster Telegram pacing without sacrificing message rendering?
> **A.** Two levers:
>   (a) **Prompt cache** the response generator's system prompt (~5 KB with
>       few-shot + visa-guidance) — cuts Claude latency by ~60% on subsequent calls
>       within 5 minutes (Anthropic's ephemeral cache TTL). Makes the third+
>       message in the demo reply in ~5 s instead of ~12 s.
>   (b) **Skip entity extraction** when intent ∈ {general, want_human,
>       injection_attempt, transferred} — removes ~10 s of parallel work that has
>       no useful output for those intents. The pipeline still LOOKS multi-agent
>       (intent runs first; entity is conditional in the trace).
> The recording script also uses tighter `waitForTimeout` between scenes (700 ms
> dwell instead of 2.4 s) where the previous version was over-padded.
>
> **Q6.** "Enterprise-ready" — what's the bar?
> **A.** Three properties:
>   1. **Type-safe end-to-end**: `make type-check` passes without `|| true`.
>   2. **Authenticated end-to-end**: webhook + portal actions verify identity;
>      no IDOR, no unauthenticated mutation surface.
>   3. **Documented end-to-end**: README + RELATORIO + DEMO_SPRINT_4 all in sync,
>      Mermaid diagrams reflect what's actually deployed, no broken instructions.
> A FIAP reviewer running `git clone && make up && bash scripts/run-demo-v2.sh`
> from a fresh machine should reach a working demo in <10 minutes with zero
> manual intervention beyond the QR scan.
>
> **Q7.** Should the customer portal's "Falar com atendente" action go through
> the agent service (which has Mongo write access) or stay on the API path?
> **A.** Stay on API path — keep the agent service's responsibility narrow
> ("LLM orchestration"). The IDOR fix lives in the portal Server Action where
> the JWT is already verified. Adds ~5 lines, no architectural change.
>
> **Q8.** drawio update — automate or accept manual?
> **A.** Manual + Mermaid fallback. The .drawio file is binary-ish (XML but
> editor-bound). Updating it requires opening draw.io. Time-boxed at 30 min;
> if it slips, the README's Mermaid block is the canonical source and the
> .drawio is marked "Sprint 3 archive" with a sed comment in the file. Don't
> let the perfect block the good.

## Context

The Sprint 4 PR (`main..sprint/4`) was reviewed in six passes and produced 59 findings
([[../2026-04-26-sprint-4-multi-agent/pr-review.md]]). The system works end-to-end and
the demo video proves it on real Telegram against real Claude — but several findings
expose security risk (IDOR, unauthenticated webhook), correctness gaps (type-check
silently disabled), and presentation gaps (slow Telegram, duplicated bot replies,
under-used visual highlights, drawio not updated, demo doc out of sync with shipped scripts).

The user has explicitly asked: *"precisa estar funcionando PROFISSIONALMENTE E PRONTO
PRA USO DE UMA EMPRESA SÉRIA"*. The bar moved from "academic working prototype" to
"enterprise demo ready". That changes which findings are in-scope.

## Problem Statement

The PR has six classes of issue, each a pre-merge blocker for an enterprise demo:

1. **Authorization holes** — portal handoff Server Action accepts any conversation_id
   without verifying ownership (P3-1 IDOR). Telegram webhook accepts unsigned POSTs
   (P3-2). Either of these is a textbook security finding a hiring manager would call out.
2. **Type-check is dishonest** — `make type-check` masks failures with `|| true`,
   so the spec's verification gate is theatre. Frontend has no type-check script at
   all.
3. **Privacy regression** — portal pulls every customer's files + conversations and
   filters client-side. Same root cause as #1, different surface.
4. **Stale documentation** — drawio still depicts n8n-era architecture; DEMO doc
   tells reviewers to use the manual `ngrok http` workflow instead of the shipped
   `setup-demo-v2.sh` automation.
5. **Demo polish gaps** — duplicate bot replies, sluggish Telegram pacing,
   under-used highlights, no `<main>` landmark, sub-44px touch targets, no typing
   indicator from the bot.
6. **Performance gaps** — every message wakes Claude twice (intent + entity even
   when entity has nothing to extract), no prompt caching, missing compound index
   on the most common interaction-log query.

## Non-Goals

The following are explicitly **out of scope** to keep this polish sprint reviewable:

- A new architecture pivot (no service split, no language change, no event bus).
- RAG / vector search (still YAGNI).
- Multi-channel work (Telegram remains the only wired channel).
- A new operator console feature (e.g., search, bulk actions).
- A second customer portal feature (e.g., document re-upload from web).
- CI/CD wiring (smoke-e2e gets a make target but no GitHub Actions).
- Schema migrations beyond adding indexes (no breaking changes to interaction_logs).
- Replacing winston with pino in the API (deferred — too invasive for this sprint).
- A test-coverage threshold (existing tests stay; we fix the one flaky test only).

## Constraints

### Hard constraints (non-negotiable)

1. **Backwards compatibility:** every Sprint 2/3/4 user-visible behavior continues
   to work. Smoke E2E remains green throughout.
2. **No new services.** Same docker-compose topology (mongo, minio, api, validation,
   agent, frontend).
3. **Same env-var surface.** No new required env vars; new optional ones are fine
   (e.g., `TELEGRAM_WEBHOOK_SECRET` defaults to a random value generated on first
   boot if unset).
4. **Same demo flow.** Reviewer runs `bash scripts/setup-demo-v2.sh` then
   `bash scripts/run-demo-v2.sh` — same two commands as before, just better internals.
5. **No regression in the typed pipeline.** The 6 named agents stay; the
   `agent_trace[]` schema stays; intent + entity remain visible as separate steps
   even when entity is conditionally skipped (a `skipped: true` trace entry replaces
   the missing run, so the trace still shows 6 agents).
6. **Recording stays under 3 minutes.** Target window 2:30–2:55.

### Soft constraints

- Prefer prompt caching over model downgrade for speed (cache preserves quality).
- Prefer adding indexes over rewriting queries.
- Prefer deletion over deprecation comments for dead code.
- Prefer Mermaid in README over re-exporting drawio PNGs (Mermaid renders inline on
  GitHub; drawio updates if there's time).

## User Stories / Scenarios

### Reviewer scenarios (the FIAP reviewer)

1. **Code review.** Reviewer runs `make type-check` from a fresh clone and the
   command exits 0 (no `|| true`). Every Node app has a `type-check` script.
2. **Security spot-check.** Reviewer opens the portal page in their browser, copies
   the JWT to a different user's browser. Portal renders empty (token verifies but
   user_id mismatches the reviewer's seeded fixtures). Reviewer tries to call
   `requestHandoff` from the network tab with a forged conversation_id — server
   action returns 403 because conversation.user_id ≠ JWT.user_id.
3. **Documentation review.** Reviewer opens README, sees a Mermaid block that
   matches what they observe in `docker compose ps`. Reviewer opens DEMO_SPRINT_4.md,
   the first command they're told to run is `bash scripts/setup-demo-v2.sh` — which
   exists and is idempotent.

### Customer scenarios (regression check)

4. **Status query.** Same as Sprint 4 spec scenario 2. Now responds 4-6 s faster
   thanks to prompt cache. The bot sends `sendChatAction(typing)` immediately on
   webhook receipt so the user sees "digitando…" while Claude thinks.
5. **Prompt injection.** Same as Sprint 4 spec scenario 6. Now visually highlighted
   in the recording with a zoom-in on the red "Injeção bloqueada" pill.
6. **Duplicate webhook delivery.** Telegram retries our webhook (we simulate a slow
   ack) — second delivery is dropped because `update_id` is in the dedup cache.
   No duplicate interaction_log, no duplicate bot reply.
7. **Forged webhook.** A POST to `/telegram/webhook` arrives without the
   `X-Telegram-Bot-Api-Secret-Token` header — agent returns 401 immediately, no
   pipeline run, no Claude tokens burned.

### Operator scenarios (regression check)

8. **Voltar para Bot misclick.** Operator clicks "Voltar para Bot" on a transferred
   conversation; a confirmation dialog appears: "Voltar conversa #X ao bot? O bot
   voltará a responder mensagens." Cancel + confirm both work.

### Demo recording v3 scenarios

9. **Duplicate-free recording.** The v3 recording runs through the same five acts,
   shows zero duplicate bot replies, and uses ≥ 7 visual highlights (vs 2 in v2).
10. **Faster Telegram act.** ACT 1 (Telegram conversation, 4 messages) completes
    in ≤ 50 s in v3 vs ~ 60 s in v2.

## Success Criteria

The polish sprint is complete when **every** item below is verifiable:

### Code

- [ ] `make type-check` exits 0 (no `|| true`). Every Node app has a `type-check`
      script. Vitest tests are excluded from `tsc --noEmit` correctly.
- [ ] `make test` exits 0. The previously-flaky JWT signature-tampering test passes
      deterministically.
- [ ] `make smoke-e2e` (new target) runs `scripts/smoke-e2e.ts` against the live
      stack and exits 0.
- [ ] The portal Server Action `requestHandoff(conversationId)` returns 403 when
      the JWT user_id ≠ conversation.user_id (verified by a unit test).
- [ ] `app/agent/src/routes/telegram-webhook.ts` rejects requests without a valid
      `X-Telegram-Bot-Api-Secret-Token` header (verified by a unit test).
- [ ] The agent webhook drops duplicate `update_id`s (verified by a unit test that
      delivers the same update twice).
- [ ] Portal `getFiles()` and `getConversations()` calls pass `?user_id=` so the
      response is already filtered server-side.
- [ ] `entity-extractor` is not invoked for intents in {general, want_human,
      transferred, injection_attempt}; the trace still shows the entity step with
      `output: { skipped: true, reason: 'intent-not-eligible' }`.
- [ ] Response generator's system prompt is sent with `cache_control: ephemeral`.
      Verified by inspecting the cache hit metric in agent logs after 2 consecutive
      messages.
- [ ] Compound index `{user_id: 1, created_at: -1}` exists on `interaction_logs`.
- [ ] `record-demo.mjs`, `record-demo-v2.mjs`, `seed-demo.ts` are deleted.

### Docs

- [ ] README's Mermaid architecture block updated to reflect Sprint 4 (no n8n).
- [ ] `docs/DEMO_SPRINT_4.md` rewritten to point at `setup-demo-v2.sh` and
      `run-demo-v2.sh`.
- [ ] `docs/DEV_SETUP.md` adds a "Claude credentials lifecycle" section explaining
      `claude setup-token` vs Keychain sync.
- [ ] `docs/RELATORIO_SPRINT_4.md` updated with a one-liner explaining the
      `claude-vision.ts` SDK-bypass for multimodal.
- [ ] `docs/diagramas/Diagramas.drawio` updated OR explicitly archived with a note
      pointing at the Mermaid block.

### A11y / UX

- [ ] Portal page wraps content in `<main role="main">` with a skip-link target.
- [ ] Loading spinner has `role="status"` + `aria-live="polite"` + sr-only text.
- [ ] Status pill shows an icon + text (not color-only).
- [ ] Portal CTA buttons are ≥ 44 px tall.
- [ ] "Voltar para Bot" shows a confirmation dialog before firing.

### Demo recording (v3)

- [ ] `docs/demo-sprint-4.mp4` regenerated, duration in `[150, 180]` seconds.
- [ ] ≥ 7 distinct spotlight or zoom-in highlights captured (counted by grepping
      the recording script for `await spotlight(` + `await zoomIn(`).
- [ ] Zero duplicate bot bubbles in any frame (visual check at 5 keyframes:
      30 s, 60 s, 90 s, 120 s, 150 s).
- [ ] Telegram typing-indicator visible when bot is processing (frame check).
- [ ] No "tgWaitForBotReply timed out" warnings in the recording log.
- [ ] Portal scene shows the timeline + documents zoomed in.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Prompt caching changes Claude responses (cache vs no-cache produce slightly different outputs) | Low | Low | Caching only the system prompt, not the user message. Output Filter catches drift. |
| Webhook secret_token requires changing the registered URL — Sprint 3 demo (if anyone reruns it) breaks | Low | Low | Acceptable per Sprint 4 spec's Open Questions section: Sprint 3 was already destroyed when Sprint 4 took over the bot. |
| update_id dedup uses a Mongo collection — adds 1 query per webhook | Low | Low | Use a TTL index (1 hour); the read is by primary key (`{update_id}` unique index). ~ 1 ms extra. |
| LoggerConfig fix breaks 8+ files of working code | Medium | Medium | Use TS module augmentation: declare a separate interface that extends `winston.Logger` and assert `(this as any as winston.Logger)` once. Or: the surgical fix — replace the class with a factory function that returns a typed `winston.Logger`. The factory approach is cleaner and the diff is contained to `logger.config.ts` + the DI registration. |
| Recording v3 uses up Claude rate limits for the day | Medium | Medium | Pre-warm credentials via `setup-demo-v2.sh`; if 429 fires, wait + retry once. The script already retries `tgWaitForBotReply` with timeouts, so a single 429 doesn't fail the recording. |
| Drawio update slips → spec checkbox unsatisfied | High | Low | Document the fallback explicitly in the spec (Mermaid is canonical, drawio is archive). Spec checkbox accepts either. |
| User wants to log into Telegram again (storage state expired) | Medium | Low | `setup-demo-v2.sh` checks `tmp/telegram-state.json` mtime; if > 24 h, prompts for re-login. |

## Open Questions

None — the user authorized me to make all decisions ("vc mesmo responde as perguntas
de /brainstorming"). All design decisions are recorded in the Design Log section above.
