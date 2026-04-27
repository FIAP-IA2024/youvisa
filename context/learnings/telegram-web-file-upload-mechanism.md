---
tags:
  - learning
  - playwright
  - telegram
  - automation
  - gotcha
related:
  - "[[../specs/2026-04-26-sprint-4-multi-agent/spec]]"
  - "[[telegram-web-bubble-counter-virtual-scrolling]]"
created: 2026-04-27
---
# Telegram WebK file upload requires the 📎 menu + filechooser interception, not direct setInputFiles

When automating Telegram Web (web.telegram.org/k/) to send a photo via Playwright,
**`page.locator('input[type="file"]').setInputFiles(path)` does NOT work** — even though
the document inspector shows a hidden `<input type="file" multiple>` at page-load. That input
is decorative scaffolding; Telegram WebK creates the actual upload input dynamically when the
user clicks an item in the 📎 attach menu, so any pre-existing input is never wired up to the
upload flow. Setting files on it succeeds without throwing but produces no UI effect: no
preview popup, no outgoing photo bubble, no bot processing.

The working mechanism is to drive the menu the same way a human does, intercepting the
file-picker dialog with Playwright's `filechooser` event:

1. Click `.btn-icon.btn-menu-toggle.attach-file` (the 📎 icon in the chat input bar)
2. Arm `page.waitForEvent('filechooser', { timeout: 10_000 })` **before** clicking the menu item
3. Click `.btn-menu-item.rp-overflow:has-text("Photo or Video")`
4. Resolve the chooser with `chooser.setFiles(imagePath)`
5. Wait for the `.popup-send-photo` preview to render
6. Click `.popup-send-photo .btn-primary` (the SEND button)
7. Wait for `.bubble.is-out.photo` to appear in chat

## Context

Discovered while adding the document-upload scene to `scripts/record-demo-v2-tg.mjs` for the
Sprint 4 v5 demo recording. The first probe (`scripts/probe-tg-upload.mjs`) tried Strategy A
(direct setInputFiles) and silently no-op'd — the chat looked unchanged after the call returned.
The second probe (`scripts/probe-tg-upload-v2.mjs`) used the menu + filechooser approach and
worked end-to-end: photo uploaded, validation/classification ran, bot replied with "Seu
documento foi classificado como Passaporte" within ~2-3s.

## How to Apply

For any Playwright/Telegram WebK automation that needs to upload a photo:

```javascript
async function tgUploadPhoto(page, imagePath) {
  const attach = page.locator('.btn-icon.btn-menu-toggle.attach-file').first();
  await attach.click();
  await page.waitForTimeout(500);

  // Arm filechooser BEFORE clicking the menu item.
  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10_000 });
  const photoItem = page
    .locator('.btn-menu-item.rp-overflow', { hasText: 'Photo or Video' })
    .first();
  await photoItem.click();

  const chooser = await fileChooserPromise;
  await chooser.setFiles(imagePath);

  await page.waitForSelector('.popup-send-photo, .popup-photo', { timeout: 8_000 });
  await page.waitForTimeout(700);

  await page.locator('.popup-send-photo .btn-primary').first().click();

  await page.waitForSelector('.bubble.is-out.photo, .bubble.is-out img.media-photo', {
    timeout: 10_000,
  });
}
```

The same pattern applies for "Document" (the menu item next to "Photo or Video") — only the
`hasText` filter changes. The send-button selector is identical.
