---
tags:
  - learning
  - playwright
  - telegram
  - automation
related:
  - "[[../specs/2026-04-26-sprint-4-multi-agent/spec]]"
created: 2026-04-27
---
# Telegram WebK uses virtual scrolling — count `.is-in` bubbles, not `.bubble`

When automating Telegram Web (web.telegram.org/k/) with Playwright to drive a bot conversation,
**`document.querySelectorAll('.bubble').length` is unreliable as a "did the bot reply?" signal**.
WebK uses virtual scrolling: bubbles outside the viewport are unmounted from the DOM, so the total
count fluctuates independently of message activity. Sending a new message and waiting for `.bubble`
count to increase by 2 (echo + reply) frequently times out even when the bot did reply on time.

**The reliable signal is the count of `.bubble.is-in` elements** (incoming messages from the bot).
Outgoing user messages get `.is-out`. Only the bot's reply increments the `.is-in` count, and that
class is applied as soon as the bubble renders, before any animation completes. Tracking
"last bubble's `innerText` changing" is also unreliable because it fires immediately when our own
message echoes back, before the bot has responded.

## Context

Discovered while building `scripts/record-demo-v2-tg.mjs` for the Sprint 4 video. The first
approach used `.bubble` count and failed: timed out at 24 even after the bot demonstrably replied
(API logs showed `intent: status_query` interaction logged within 12s). The second approach used
last-bubble text-change detection and was *too* fast — fired in <1s on the user-message echo, so
the script tried to scrape the bot's portal URL from bubbles before the bot had even responded,
and the portal scene was skipped. Switching the waiter to `document.querySelectorAll('.bubble.is-in').length`
fixed both issues and let the recording capture the full portal scene end-to-end.

## How to Apply

For any Playwright/Telegram WebK automation that needs to wait for a bot reply:

```javascript
async function tgCountIncomingBubbles(page) {
  return page.evaluate(
    () => document.querySelectorAll('.bubble.is-in, .Message.is-in').length,
  );
}

async function tgWaitForBotReply(page, beforeIncomingCount, maxMs = 28_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const n = await tgCountIncomingBubbles(page);
    if (n > beforeIncomingCount) {
      await page.waitForTimeout(1100);  // let the bubble fully render
      return n;
    }
    await page.waitForTimeout(350);
  }
  return beforeIncomingCount;  // soft-fail; caller should still proceed
}
```

Always: capture `beforeCount = await tgCountIncomingBubbles(page)` *before* calling `tgSend`.
Then await `tgWaitForBotReply(page, beforeCount, 25_000)`. The 1.1s post-render delay is needed
because some bot messages (especially those with attachments or markdown URLs) finish rendering a
beat after the bubble enters the DOM.

The `.Message.is-in` fallback in the selector covers WebA (web.telegram.org/a/), the alternative
Telegram Web client some accounts get routed to.
