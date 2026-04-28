/**
 * Demo seed for the v2 (real-Telegram) recording.
 *
 * The recording uses your actual Telegram account as the "customer". This
 * script picks the **most recently active Telegram user** in our DB
 * (assumed to be you, who just sent "olá" to the bot during login),
 * sets a friendly first_name + email so the demo looks polished, and
 * makes sure that user has:
 *   - 1 active conversation in the `transferred->active` state
 *   - 1 visa process in `em_analise` (with `recebido -> em_analise` history)
 *   - 2 classified files (Passaporte + RG) attached
 *
 * Idempotent. Re-running upserts the same artifacts.
 *
 * Run from host:
 *   npx tsx scripts/seed-demo-from-tg.ts
 *
 * Output: prints `tmp/demo-context.json` with ids the recording script reads.
 */

import mongoose from 'mongoose';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:5555';
const KEY = process.env.API_KEY ?? 'fiap-iatron';
const MONGO = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const DB = process.env.MONGODB_DATABASE ?? 'youvisa';

async function api<T = any>(
  p: string,
  init: RequestInit & { body?: any } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'x-api-key': KEY };
  let body = init.body;
  if (body && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${p}`, { ...init, headers, body });
  if (!res.ok) {
    throw new Error(`${p} → ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function looksLikeTgId(id: string): boolean {
  // Real Telegram ids are numeric. Length range 6-15 to cover legacy
  // and modern 64-bit IDs. Filters out fixtures like "smoke", "portal-test".
  return /^\d{6,15}$/.test(id);
}

async function main() {
  console.log(`API=${API}  MONGO=${MONGO}/${DB}`);

  // 1. Find the most recent real Telegram user
  const list = await api<{ data: any[] }>('/users');
  const tgUsers = (list.data ?? [])
    .filter((u) => looksLikeTgId(String(u.telegram_id)))
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    );

  if (tgUsers.length === 0) {
    console.error(
      'No real Telegram user found. Run scripts/telegram-login.mjs first and send "olá" to the bot.',
    );
    process.exit(1);
  }

  const me = tgUsers[0];
  console.log('  using user :', me._id, me.first_name ?? '(no name)', '— tg', me.telegram_id);

  // 2. Polish the user record (friendly name / email so the demo is consistent)
  // We keep the *real* Telegram first_name to feel authentic, but make sure
  // there's an email and language code set.
  await api(`/users/${me._id}`, {
    method: 'PUT',
    body: {
      email: me.email ?? `${me.first_name?.toLowerCase() ?? 'cliente'}@example.com`,
      email_updated_at: new Date(),
      language_code: me.language_code ?? 'pt-BR',
    },
  });

  // 3. Find / create the active conversation for this user
  //    (the upsert endpoint matches on user_id + chat_id)
  const conv = await api<{ data: any }>(`/conversations/upsert`, {
    method: 'POST',
    body: {
      user_id: me._id,
      channel: 'telegram',
      chat_id: String(me.telegram_id), // Telegram chat_id == user's id for private chats
      status: 'active',
      last_message_at: new Date(),
      metadata: { state: 'PRONTO' },
    },
  });
  console.log('  conversation:', conv.data._id);

  // 4. Make sure the conversation status is `active` (login flow may have left it elsewhere)
  await api(`/conversations/${conv.data._id}`, {
    method: 'PUT',
    body: { status: 'active' },
  });

  // 5. WIPE existing processes for this user — every demo run accumulates
  //    a new process, and the bot's status_query response then mentions
  //    "Você tem N processos…" which is confusing and unprofessional. We
  //    want exactly 1 visible process per recording.
  await mongoose.connect(MONGO, { dbName: DB });
  const Processes = mongoose.connection.collection('processes');
  const Files = mongoose.connection.collection('files');
  const Messages = mongoose.connection.collection('messages');
  const userOid = new mongoose.Types.ObjectId(me._id);
  const convOid = new mongoose.Types.ObjectId(conv.data._id);

  const wipedProcesses = await Processes.deleteMany({ user_id: userOid });
  await Files.deleteMany({ conversation_id: convOid });
  await Messages.deleteMany({
    conversation_id: convOid,
    message_id: { $regex: '^demo-' },
  });
  console.log(
    `  wiped       : ${wipedProcesses.deletedCount} stale processes + their files`,
  );

  // 6. Create the canonical process via the API (so FSM history is properly
  //    initialized).
  const created = await api<{ data: any }>(`/processes`, {
    method: 'POST',
    body: {
      user_id: me._id,
      conversation_id: conv.data._id,
      visa_type: 'turismo',
      destination_country: 'Estados Unidos',
      notes: 'Pedido aberto via Telegram — demo Sprint 4',
    },
  });
  await api(`/processes/${created.data._id}/status`, {
    method: 'POST',
    body: {
      status: 'em_analise',
      reason: 'Documentos básicos recebidos, iniciando análise.',
      changed_by: 'operator-demo',
    },
  });
  const proc = created.data;
  console.log('  process     :', proc._id, '(em_analise — clean state)');

  const t0 = Date.now() - 1000 * 60 * 60 * 24 * 2; // 2 days ago

  const msgPassport = await Messages.insertOne({
    conversation_id: convOid,
    message_id: `demo-photo-passport-${t0}`,
    user_id: userOid,
    message_type: 'photo',
    direction: 'incoming',
    timestamp: new Date(t0),
    metadata: { telegram_file_id: 'demo-file-passport', file_name: 'passaporte.jpg' },
    created_at: new Date(t0),
  });
  const msgRG = await Messages.insertOne({
    conversation_id: convOid,
    message_id: `demo-photo-rg-${t0 + 1000 * 60 * 5}`,
    user_id: userOid,
    message_type: 'photo',
    direction: 'incoming',
    timestamp: new Date(t0 + 1000 * 60 * 5),
    metadata: { telegram_file_id: 'demo-file-rg', file_name: 'rg.jpg' },
    created_at: new Date(t0 + 1000 * 60 * 5),
  });

  await Files.insertMany([
    {
      conversation_id: convOid,
      message_id: msgPassport.insertedId,
      file_id: 'demo-passport',
      s3_bucket: 'youvisa-files',
      s3_key: 'demo/passaporte.jpg',
      original_filename: 'passaporte.jpg',
      file_size: 248_300,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(t0),
      document_type: 'Passaporte',
      classification_confidence: 0.95,
      classification_status: 'completed',
      classified_at: new Date(t0 + 5_000),
      created_at: new Date(t0),
    },
    {
      conversation_id: convOid,
      message_id: msgRG.insertedId,
      file_id: 'demo-rg',
      s3_bucket: 'youvisa-files',
      s3_key: 'demo/rg.jpg',
      original_filename: 'rg-frente.jpg',
      file_size: 184_120,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(t0 + 1000 * 60 * 5),
      document_type: 'RG',
      classification_confidence: 0.92,
      classification_status: 'completed',
      classified_at: new Date(t0 + 1000 * 60 * 5 + 5_000),
      created_at: new Date(t0 + 1000 * 60 * 5),
    },
  ]);
  console.log('  files       : 2  (Passaporte + RG)');

  await mongoose.disconnect();

  // 7. Persist tmp/demo-context.json for the recording script
  const ctx = {
    user_id: me._id,
    telegram_id: String(me.telegram_id),
    first_name: me.first_name ?? 'Cliente',
    conversation_id: conv.data._id,
    process_id: proc._id,
  };
  mkdirSync('tmp', { recursive: true });
  writeFileSync(path.resolve('tmp/demo-context.json'), JSON.stringify(ctx, null, 2));
  console.log('  wrote       : tmp/demo-context.json');

  console.log('');
  console.log('Demo context:');
  console.log(JSON.stringify(ctx, null, 2));
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
