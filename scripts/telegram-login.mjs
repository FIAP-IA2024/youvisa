#!/usr/bin/env node
/**
 * One-time Telegram Web login for the demo recording.
 *
 * Opens a headed Chromium at web.telegram.org, waits for the user to
 * log in (QR code from Telegram mobile app, or phone+SMS), then saves
 * the storage state so the recording script can drive the same logged
 * in session in headless mode.
 *
 * Usage:
 *   node scripts/telegram-login.mjs
 *
 * Output:
 *   tmp/telegram-state.json
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const STATE = path.resolve('tmp/telegram-state.json');

async function main() {
  mkdirSync(path.dirname(STATE), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log('opening Telegram Web…');
  await page.goto('https://web.telegram.org/k/');

  console.log('');
  console.log('🔑 Faça login na janela que abriu (QR do app no celular OU phone+SMS).');
  console.log('   Quando a lista de conversas aparecer, este script salva a sessão e fecha.');
  console.log('   Aguardando…');
  console.log('');

  // Wait for the chat list to render — that's the signal we're logged in.
  // WebK's main column has class `.chatlist` (legacy) or items with `.chatlist-chat`.
  // Use a permissive locator.
  // Poll every 2s for up to 8 minutes — gives plenty of time for QR scan + bot init
  const MAX_WAIT_MS = 8 * 60_000;
  const startedAt = Date.now();
  let lastTick = 0;
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    const ok = await page.evaluate(() => {
      const sel =
        '.chatlist-chat, [data-peer-id], .chatlist-container .ListItem, [data-testid^="chat"]';
      return document.querySelector(sel) !== null;
    });
    if (ok) break;
    if (Date.now() - lastTick > 30_000) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      console.log(`   …${elapsed}s aguardando login (cancele com Ctrl+C se travou)`);
      lastTick = Date.now();
    }
    await page.waitForTimeout(2000);
  }
  if (Date.now() - startedAt >= MAX_WAIT_MS) {
    throw new Error('login timeout — janela ficou aberta mais de 8min sem chat list');
  }

  console.log('✓ logado. salvando estado…');
  await context.storageState({ path: STATE });
  console.log('✓ estado salvo em', STATE);

  // Now poll our API for a real Telegram user (created by webhook) so we
  // know the user has chatted with the bot at least once. Times out after
  // 4 minutes — at that point we save what we have and exit.
  console.log('');
  console.log('Próximo passo:');
  console.log('  → Na janela do Telegram, busque @youvisa_test_assistant_s3_bot');
  console.log('  → Mande qualquer mensagem (ex: "olá") pra criar seu user no banco');
  console.log('  → Este script detecta e fecha automaticamente.');
  console.log('');

  const API = process.env.API_URL ?? 'http://localhost:5555';
  const KEY = process.env.API_KEY ?? 'fiap-iatron';
  const POLL_MAX_MS = 4 * 60_000;
  const pollStart = Date.now();
  let foundUser = null;
  while (Date.now() - pollStart < POLL_MAX_MS) {
    try {
      const res = await fetch(`${API}/users`, { headers: { 'x-api-key': KEY } });
      const body = await res.json();
      const tgUsers = (body.data ?? []).filter((u) =>
        /^\d{6,12}$/.test(String(u.telegram_id ?? '')),
      );
      if (tgUsers.length > 0) {
        // Pick the most recently updated one
        tgUsers.sort(
          (a, b) =>
            new Date(b.updated_at ?? b.created_at).getTime() -
            new Date(a.updated_at ?? a.created_at).getTime(),
        );
        const top = tgUsers[0];
        const ageMs = Date.now() - new Date(top.updated_at ?? top.created_at).getTime();
        if (ageMs < 5 * 60_000) {
          foundUser = top;
          break;
        }
      }
    } catch (_) {
      /* api may be transient */
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  if (foundUser) {
    console.log(
      `✓ user detectado: ${foundUser.first_name ?? '(sem nome)'} (tg ${foundUser.telegram_id})`,
    );
  } else {
    console.warn(
      '⚠ nenhum user real do Telegram detectado em 4min. seed pode falhar.',
    );
  }

  await context.storageState({ path: STATE });
  await browser.close();
  console.log('✅ pronto. agora rode:  bash scripts/run-demo-v2.sh');
}

main().catch((err) => {
  console.error('login failed:', err);
  process.exit(1);
});
