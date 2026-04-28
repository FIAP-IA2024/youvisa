---
status: approved
feature: sprint-4-demo-v4
created: 2026-04-27
shipped: null
parent: 2026-04-27-sprint-4-polish
---
# Sprint 4 Demo v4 — fix message-order bug + deeper dashboard tour

**Status:** Approved (self-brainstormed, user authorized)
**Scope:** Fix the "bot replies are off by one" bug visible in v3, wipe stale process records that pollute the demo, deepen the operator console tour, then re-record. **Validate the fix three times** before producing the final mp4.
**Goal:** the bot answers each user message correctly, in order, like a real production chatbot. The dashboard scenes get enough screen time that a reviewer can read them without pausing.

## Design log (self-brainstormed Q&A)

> **Q1.** Why are the v3 bot replies off by one (greeting in Q1's slot, status in Q2's slot)?
> **A.** Race between the *warmup* phase and the *recording* phase. Warmup
> sent "olá" via Telegram Web; the bot took >25 s to respond (Claude
> latency + cold cache); `tgWaitForBotReply` timed out; the script
> declared warmup done and started the real recording context. By the
> time the bot's "Olá! Sou o assistente…" actually arrived, the
> recording was already on Q1, so it landed in Q1's visual slot. Same
> shift cascaded into Q2/Q3.
>
> **Q2.** What's the cleanest fix?
> **A.** Don't use Telegram Web for warmup. Hit the `/demo/send` endpoint
> on the agent service directly (already exists from earlier sprints) —
> it runs the same pipeline, creates the same user/conversation row,
> but never touches Telegram Web bubbles. Warmup becomes invisible to
> the recording, eliminating the bleed.
>
>   Alternative considered: longer timeout (60 s) on `tgWaitForBotReply`
>   during warmup. Rejected — fragile under any future Claude latency
>   spike, and doesn't fix the broader pattern.
>
> **Q3.** Why does the status reply say "Você tem 5 processos…"?
> **A.** Each `seed-demo-from-tg.ts` run **adds** a process to Mosquito's
> record without cleaning previous ones. After 5 attempted recordings,
> Mosquito has 5 processes. Lookup returns all of them; the response
> generator dutifully describes each.
>
>   Fix: seed wipes existing processes for the user (and their associated
>   demo files) before creating the canonical one. One process in
>   `em_analise`, two demo files (Passaporte + RG), nothing else.
>
> **Q4.** What about residue from previous runs in Telegram (the auto-notification
> from attempt 5 still visible at the top of the chat)?
> **A.** Telegram doesn't allow the bot to delete its own outbound
> messages older than 48 h, and we can't delete user messages either.
> The chat history is whatever it is. Mitigation: the recording
> *scrolls to bottom* before each scene starts, so old messages drift
> off-screen. The viewer sees only the current run's exchange.
>
>   Plus the auto-notification template at start was: "Seus documentos
>   foram recebidos…" — perfectly on-brand for the recording, just
>   misleading because it pre-dates the run. The recording will
>   generate a NEW status notification in ACT 3 (status change scene)
>   that lands BELOW Q3's handoff bubble; the viewer will see the new
>   notification in context.
>
> **Q5.** "Mostre mais o dashboard" — what does deeper tour look like?
> **A.** v3 spent ~45 s on the operator console (out of 142 s total).
> v4 will spend ~75 s with the following extras:
>   - **Conversations page:** scroll through the table once, then
>     spotlight the transferred banner (5 s instead of 3 s, plus an
>     extra zoom on the chat_id column to show "real" Telegram IDs).
>   - **Interactions page:** zoom on the agent_trace pills sustained
>     for 6 s (was 3 s) so the duration_ms numbers are readable. Then
>     scroll to the next interaction and spotlight a *different* trace
>     (showing the variation: status_query vs injection_attempt).
>   - **Documents page:** dwell 7 s (was 3.5 s) and zoom on the
>     "Confiança" column showing classification scores.
>   - **Process detail page:** before changing status, dwell 5 s on the
>     timeline + status history table.
>   - **Users page (NEW):** scroll the user table briefly to show
>     channel + first_name + telegram_id columns. 4 s.
>   - **NEW caption when navigating:** show "Console — N de M" badges
>     so the viewer knows where they are.
>
> **Q6.** "Valide tudo 3 vezes" — three what exactly?
> **A.** Three independent validation passes before the final recording:
>   1. **Code review pass.** I re-read the changed scripts and grep for
>      every regression vector — does warmup still create the user?
>      does seed still wipe? does the recording still capture all 11
>      highlights? Cap: 5 minutes.
>   2. **API smoke pass.** Hit `/demo/send` once per intent (status_query,
>      injection_attempt, want_human, open_portal). Assert each response
>      makes sense. Cap: 5 minutes.
>   3. **Dry-run pass.** Run the actual recording end-to-end with output
>      to a *throwaway* mp4 path (`/tmp/demo-dry.mp4`). Watch a few
>      keyframes. Confirm message order is correct. Cap: 5 minutes.
>   Only after all three pass do I overwrite `docs/demo-sprint-4.mp4`.
>
> **Q7.** What if a validation fails?
> **A.** Hard stop. Don't silently move forward. Surface the failure to
> the user, propose a fix, wait for OK. The user explicitly said "não
> saia fazendo nada sem eu permitir" — that applies during the
> validation phases too.
>
> **Q8.** Recording duration target?
> **A.** User said "não tem problema passar de 3 minutos, eu acelero o
> video depois se necessário". So target ~3:30 (210 s) is fine. Lower
> bound: don't go under 2:50, otherwise the dashboard tour is again
> too rushed.

## Context

The v3 demo recording (commit `56443be`) shipped with two flaws the user
caught when reviewing the actual Telegram chat:

1. **Bot replies in wrong slots.** "Olá! Sou o assistente…" appears as
   the response to "como anda meu pedido?" instead of the actual status
   answer; status answer appears as response to the injection attempt.
2. **5 stale processes.** Status reply says "Você tem 5 processos de
   visto", because seed accumulated processes across runs.

The user's bar: **"como um chatbot profissional pra produção em uma
empresa séria seria."** Off-by-one bot replies fail that bar instantly.

Plus the user wants more screen time on the operator console — v3
spent only ~45 s there, with rapid scene transitions that don't give
the FIAP reviewer time to read what's on screen.

## Problem Statement

Three problems, in order of severity:

1. **🔴 Bot reply order misaligned.** Caused by warmup-bleed: warmup
   used Telegram Web → bot reply landed during recording. Visible in
   the v3 mp4. Reviewer-visible bug.
2. **🔴 Stale processes pollute the status reply.** "5 processos"
   instead of 1. Caused by seed not wiping previous runs.
3. **🟡 Dashboard tour rushed.** v3 spent ~45 s on console (32% of
   142 s). User wants ~75 s (35-40% of a longer ~3:00 video).

## Non-Goals

- New service, new architecture, new UI surface.
- Deleting old auto-notification messages from the Telegram chat
  (Telegram API doesn't allow it for bot messages > 48 h old).
- Changing the multi-agent pipeline behavior. Only the orchestration
  *around* the recording changes.
- Adding new features to the operator console (only adjust dwell time
  + add the Users page tour).

## Constraints

### Hard

1. **Each bot reply must be in the correct slot.** Q1 → status_query
   answer (1 process), Q2 → injection_attempt refusal, Q3 → want_human
   ack, Q4 → open_portal URL.
2. **Mosquito's status reply must mention exactly 1 process** in
   `em_analise` with 2 docs (Passaporte + RG).
3. **Recording must complete the 11 highlights from v3** plus the new
   ones below.
4. **Final mp4 duration ∈ [180, 240] s** (3:00 to 4:00).
5. **3 validation passes pass green** before overwriting the final mp4.

### Soft

- Prefer API-driven waits (poll `interaction_logs`) over DOM-driven
  bubble-count waits where possible.
- Prefer cleaning state in the seed script over orchestrating cleanup
  outside.

## User Stories / Scenarios

### Recording flow (target)

1. **Warmup (off-camera).** Script POSTs to `/demo/send` with
   `text="olá"` and Mosquito's telegram_id. Bot pipeline runs, creates
   user + conversation rows, returns response in JSON. Recording context
   is not yet open; nothing is captured.
2. **Seed.** `seed-demo-from-tg.ts` finds Mosquito, **wipes** any
   existing processes + their files, creates 1 fresh process in
   `em_analise` with 2 demo files.
3. **Open Telegram Web (recording starts).**
4. **ACT 1 — Telegram (60-70 s):** Q1 status, Q2 injection, Q3 handoff.
   Each scene waits for the bot reply via API polling AND visible
   bubble before advancing.
5. **ACT 2 — Console (75 s):** login → conversations (with extra
   spotlights) → interactions (sustained agent_trace zoom) → documents
   (with confidence column zoom) → users (NEW, 4 s tour).
6. **ACT 3 — Status change & notification (35 s):** process detail →
   spotlight timeline → change status → return to Telegram, see
   notification land.
7. **ACT 4 — Customer portal (35 s):** "abrir portal" in Telegram,
   zoom on JWT URL, navigate, two spotlights (timeline + documents).
8. **ACT 5 — Closing card (5 s).**

Total: 4 + 65 + 75 + 35 + 35 + 5 = **219 s ≈ 3:39**.

### Validation scenarios

- **VS-1 (code review):** read every changed script, list each
  regression vector tested.
- **VS-2 (API smoke):** call `/demo/send` four times (one per intent
  bucket), assert response text matches the intent label + entities.
- **VS-3 (dry run):** record to `/tmp/demo-dry.mp4`, extract 6
  keyframes (every 30 s), inspect each: does the screen content match
  the moment it represents in the script?

## Success Criteria

- [ ] Mosquito has exactly 1 process after seed (verified by
      `GET /processes/user/<id>`).
- [ ] Warmup runs via `/demo/send`, never via Telegram Web. Recording
      context opens with Telegram chat in stable state.
- [ ] In the final mp4, frame at "Q1 status reply" shows a status
      answer with "1 processo de Visto de Turismo Em Análise" — NOT a
      generic greeting.
- [ ] In the final mp4, frame at "Q2 reply" shows the deterministic
      refusal — NOT a status dump.
- [ ] In the final mp4, frame at "Q3 reply" shows the handoff
      acknowledgment.
- [ ] Recording duration ∈ [180, 240] s.
- [ ] ≥ 13 visual highlights captured (11 from v3 + 2 new on Users
      page + extended dwell on existing).
- [ ] All 3 validation passes (VS-1, VS-2, VS-3) green before final
      mp4 is overwritten.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `/demo/send` endpoint changed signature | Low | Medium | Read demo route before building warmup; fall back to Telegram Web warmup if endpoint missing. |
| Wiping Mosquito's processes wipes the conversation_id used by the recording | Medium | High | Wipe `processes` + `files` only, never `conversations` or `users`. Test with a single ProcessRepository.findAll dump before/after. |
| Telegram chat history still pollutes the early frames | High | Low | Scrolling to bottom + a fresh top-of-screen caption hides the residue visually. Cosmetic, not functional. |
| Sustained zoom-in on the agent_trace pills causes scrollbars to overflow on certain screens | Low | Low | Use a translation-only zoom (no DOM mutation) so layout doesn't shift. Already the case in `zoomIn`. |
| 3 validation passes take 15+ minutes and hit the user's patience | Medium | Low | Each pass is bounded (5 min cap). If anything fails, stop and ask. |

## Open Questions

None — user authorized me to make decisions and report progress.
