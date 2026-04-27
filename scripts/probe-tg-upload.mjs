#!/usr/bin/env node
/**
 * Probe: discover Telegram WebK's file-upload mechanism.
 *
 * Strategy A: query existing `<input type="file">` and set its value
 *   directly via Playwright's setInputFiles. No clicks.
 *
 * Strategy B: click the 📎 paperclip icon in the chat input area;
 *   inspect the menu that appears; pick "Photo or Video".
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { VIEWPORT, injectInitScripts } from './demo-helpers.mjs';

const TG_STATE = path.resolve('tmp/telegram-state.json');
const IMG = '/tmp/demo-passport.jpg';
const OUT = '/tmp/probe-upload';

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

  // ----- Strategy A: direct setInputFiles -----
  const fileInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type="file"]')).map((el) => ({
      name: el.name,
      accept: el.accept,
      multiple: el.multiple,
      visible: el.offsetParent !== null,
      classes: el.className,
    })),
  );
  console.log('file inputs found:');
  console.log(JSON.stringify(fileInputs, null, 2));

  if (fileInputs.length > 0) {
    console.log('▶ Strategy A: setInputFiles on first input');
    try {
      // First input might be hidden; setInputFiles works on hidden ones too
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles(IMG);
      await page.waitForTimeout(2500);
      await shot(page, 'A-after-setInputFiles');
    } catch (err) {
      console.warn('  Strategy A failed:', err.message);
    }
  }

  // ----- Strategy B: click 📎 icon -----
  console.log('▶ Strategy B: clicking 📎');
  const attach = page
    .locator(
      '.btn-icon.btn-menu-toggle.attach-file, [class*="attach"], button[title*="ttach" i], [aria-label*="ttach" i]',
    )
    .first();
  if ((await attach.count()) > 0) {
    await attach.click().catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, 'B-after-attach-click');

    const menuItems = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.btn-menu-item, [role="menuitem"]'))
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          text: el.innerText?.slice(0, 50),
          classes: el.className,
        })),
    );
    console.log('attach menu items:');
    console.log(JSON.stringify(menuItems, null, 2));
  }

  await page.waitForTimeout(3000);
  await context.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
