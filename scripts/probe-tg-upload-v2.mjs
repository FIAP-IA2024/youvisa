#!/usr/bin/env node
/**
 * Probe v2: discover Telegram WebK's file-upload mechanism via the
 * paperclip menu + file chooser interception.
 *
 * Strategy: open chat → click 📎 → set up filechooser handler → click
 * "Photo or Video" → provide file → wait for preview dialog →
 * inspect what's on screen → click send → verify message appears.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { VIEWPORT, injectInitScripts } from './demo-helpers.mjs';

const TG_STATE = path.resolve('tmp/telegram-state.json');
const IMG = '/tmp/demo-passport.jpg';
const OUT = '/tmp/probe-upload-v2';

let n = 0;
async function shot(page, label) {
  n++;
  await page.screenshot({
    path: `${OUT}/${String(n).padStart(2, '0')}-${label}.png`,
  });
  console.log(`  📸 ${OUT}/${String(n).padStart(2, '0')}-${label}.png`);
}

async function main() {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: TG_STATE,
  });
  await injectInitScripts(context);
  const page = await context.newPage();

  await page.goto(
    'https://web.telegram.org/k/#@youvisa_test_assistant_s3_bot',
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForSelector('.input-message-input', { timeout: 30_000 });
  await page.waitForTimeout(3000);
  await shot(page, 'after-open');

  // Step 1: click 📎 attach button
  console.log('▶ Step 1: clicking 📎');
  const attach = page.locator('.btn-icon.btn-menu-toggle.attach-file').first();
  if ((await attach.count()) === 0) {
    console.error('attach button not found');
    process.exit(1);
  }
  await attach.click();
  await page.waitForTimeout(600);
  await shot(page, 'menu-open');

  // Step 2: set up filechooser handler BEFORE clicking the menu item
  console.log('▶ Step 2: arming filechooser + clicking "Photo or Video"');
  const fileChooserPromise = page.waitForEvent('filechooser', {
    timeout: 10_000,
  });

  // Click "Photo or Video" menu item
  const photoItem = page
    .locator('.btn-menu-item.rp-overflow', { hasText: 'Photo or Video' })
    .first();
  await photoItem.click();

  // Step 3: wait for filechooser and provide the file
  let chooser;
  try {
    chooser = await fileChooserPromise;
    console.log(
      `  ✓ filechooser fired (multi: ${chooser.isMultiple()}, accept: ${
        chooser.element ? 'n/a' : 'n/a'
      })`,
    );
    await chooser.setFiles(IMG);
    console.log(`  ✓ file set: ${IMG}`);
  } catch (err) {
    console.error('  ✗ filechooser timed out:', err.message);
  }

  await page.waitForTimeout(2000);
  await shot(page, 'after-file-set');

  // Step 4: inspect what's on screen — is there a preview popup?
  const popups = await page.evaluate(() => {
    const items = [];
    document
      .querySelectorAll('.popup, .popup-send-photo, [class*="popup"]')
      .forEach((el) => {
        if (el.offsetParent === null) return;
        items.push({
          classes: el.className,
          text: el.innerText?.slice(0, 100),
          hasButtons: !!el.querySelector('button'),
        });
      });
    return items;
  });
  console.log('visible popups:');
  console.log(JSON.stringify(popups, null, 2));

  // Look for the send button inside any popup
  const sendButtons = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('.popup button, [class*="popup"] button'),
    )
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({
        text: b.innerText?.slice(0, 30),
        classes: b.className,
      }));
  });
  console.log('popup buttons:');
  console.log(JSON.stringify(sendButtons, null, 2));

  await shot(page, 'preview-inspection');

  // Step 5: click send (try common patterns)
  console.log('▶ Step 5: clicking send');
  // Telegram WebK uses ".popup-send-photo .btn-primary" usually
  const sendCandidates = [
    'button.btn-primary.popup-send-photo-confirm',
    '.popup-send-photo .btn-primary',
    '.popup-peer .btn-primary',
    '.popup .btn-primary',
  ];
  let clicked = false;
  for (const sel of sendCandidates) {
    const btn = page.locator(sel).first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      console.log(`  trying selector: ${sel}`);
      await btn.click().catch(() => {});
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    console.warn('  no send button matched — trying Enter');
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(2500);
  await shot(page, 'after-send');

  // Step 6: confirm photo appears in chat
  const photoBubbles = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('.bubble.is-out, .bubble.is-out img'),
    )
      .slice(-5)
      .map((el) => ({
        tag: el.tagName,
        classes: el.className?.slice(0, 80),
        src: el.src ? el.src.slice(0, 60) : null,
      }));
  });
  console.log('recent outgoing bubbles:');
  console.log(JSON.stringify(photoBubbles, null, 2));

  await page.waitForTimeout(8000); // give bot time to validate + classify
  await shot(page, 'after-bot-reply');

  await page.waitForTimeout(2000);
  await context.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
