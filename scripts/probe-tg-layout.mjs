#!/usr/bin/env node
/**
 * Read-only diagnostic of Telegram WebK layout. No CSS injection.
 * Just opens, dumps the computed widths of #column-left/center/right,
 * exits. Use to figure out what the layout actually does before
 * deciding which CSS will work.
 */
import { chromium } from 'playwright';
import path from 'node:path';

const TG_STATE = path.resolve('tmp/telegram-state.json');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: TG_STATE,
  });
  const page = await context.newPage();
  await page.goto(
    'https://web.telegram.org/k/#@youvisa_test_assistant_s3_bot',
    { waitUntil: 'domcontentloaded' },
  );
  await page.waitForSelector('.input-message-input, .bubbles-inner', {
    timeout: 30_000,
  });
  await page.waitForTimeout(2500);

  const layout = await page.evaluate(() => {
    const out = {};
    for (const id of ['column-left', 'column-center', 'column-right']) {
      const el = document.getElementById(id);
      if (!el) {
        out[id] = null;
        continue;
      }
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      out[id] = {
        left: r.left,
        width: r.width,
        height: r.height,
        display: cs.display,
        flex: cs.flex,
        position: cs.position,
        zIndex: cs.zIndex,
      };
    }
    out.body = {
      width: window.innerWidth,
      height: window.innerHeight,
      classes: document.body.className,
    };
    out.parent = document.getElementById('column-center')?.parentElement
      ? {
          tag: document.getElementById('column-center').parentElement.tagName,
          id: document.getElementById('column-center').parentElement.id,
          class: document.getElementById('column-center').parentElement.className,
          display: window.getComputedStyle(
            document.getElementById('column-center').parentElement,
          ).display,
        }
      : null;
    return out;
  });

  console.log(JSON.stringify(layout, null, 2));

  await context.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
