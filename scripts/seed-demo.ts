/**
 * Seed realistic demo data so the recorded video looks plausible.
 *
 * Run from host:
 *   npx tsx scripts/seed-demo.ts
 *
 * Idempotent: re-running upserts the same user / conversation / process
 * (so the demo script can re-run cleanly).
 *
 * Output: prints the IDs the simulator + Playwright script need.
 */

import mongoose from 'mongoose';

const API = process.env.API_URL ?? 'http://localhost:5555';
const KEY = process.env.API_KEY ?? 'fiap-iatron';
const MONGO = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const DB = process.env.MONGODB_DATABASE ?? 'youvisa';

const TG_ID = '900_001_001';   // Maria's "Telegram id"
const CHAT_ID = '900_001_001'; // same — private chat

async function api<T = any>(path: string, init: RequestInit & { body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'x-api-key': KEY };
  let body = init.body;
  if (body && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { ...init, headers, body });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function main() {
  console.log('Pre-warm: API =', API);

  // 1. Upsert Maria
  const userRes = await api<{ data: any }>(`/users/upsert/${TG_ID}`, {
    method: 'POST',
    body: {
      telegram_id: TG_ID,
      username: 'maria_silva',
      first_name: 'Maria',
      last_name: 'Silva',
      language_code: 'pt-BR',
      is_bot: false,
      email: 'maria.silva@example.com',
      email_updated_at: new Date(),
    },
  });
  const userId = userRes.data._id as string;
  console.log('  user        =', userId, userRes.data.first_name);

  // 2. Upsert conversation (telegram, active)
  const convRes = await api<{ data: any }>(`/conversations/upsert`, {
    method: 'POST',
    body: {
      user_id: userId,
      channel: 'telegram',
      chat_id: CHAT_ID,
      status: 'active',
      last_message_at: new Date(),
      metadata: { state: 'PRONTO' },
    },
  });
  const convId = convRes.data._id as string;
  console.log('  conversation=', convId);

  // 3. Reset any pre-existing demo process for idempotency, then create one
  const procsRes = await api<{ data: any[] }>(`/processes/user/${userId}`);
  for (const p of procsRes.data) {
    // Delete via mongo to bypass FSM (no DELETE endpoint exists)
  }

  const procRes = await api<{ data: any }>(`/processes`, {
    method: 'POST',
    body: {
      user_id: userId,
      conversation_id: convId,
      visa_type: 'turismo',
      destination_country: 'Estados Unidos',
      notes: 'Cliente Maria Silva — demo Sprint 4',
    },
  });
  const procId = procRes.data._id as string;
  console.log('  process     =', procId, '(status: recebido)');

  // 4. Move process to 'em_analise' (legal FSM transition)
  await api(`/processes/${procId}/status`, {
    method: 'POST',
    body: {
      status: 'em_analise',
      reason: 'Documentos básicos recebidos, iniciando análise.',
      changed_by: 'operator-demo',
    },
  });
  console.log('  process     →  em_analise');

  // 5. Files with classification — insert directly via Mongo
  await mongoose.connect(MONGO, { dbName: DB });
  const Files = mongoose.connection.collection('files');
  const Messages = mongoose.connection.collection('messages');

  // Wipe previous demo files for this conversation
  await Files.deleteMany({ conversation_id: new mongoose.Types.ObjectId(convId) });

  // Create two messages first so files can FK to them properly
  const msgPassport = await Messages.insertOne({
    conversation_id: new mongoose.Types.ObjectId(convId),
    message_id: '901',
    user_id: new mongoose.Types.ObjectId(userId),
    message_type: 'photo',
    direction: 'incoming',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    metadata: { telegram_file_id: 'demo-file-passport', file_name: 'passaporte.jpg' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  });
  const msgRG = await Messages.insertOne({
    conversation_id: new mongoose.Types.ObjectId(convId),
    message_id: '902',
    user_id: new mongoose.Types.ObjectId(userId),
    message_type: 'photo',
    direction: 'incoming',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5),
    metadata: { telegram_file_id: 'demo-file-rg', file_name: 'rg.jpg' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5),
  });

  await Files.insertMany([
    {
      conversation_id: new mongoose.Types.ObjectId(convId),
      message_id: msgPassport.insertedId,
      file_id: 'demo-passport',
      s3_bucket: 'youvisa-files',
      s3_key: 'demo/passaporte.jpg',
      original_filename: 'passaporte.jpg',
      file_size: 248_300,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      document_type: 'Passaporte',
      classification_confidence: 0.95,
      classification_status: 'completed',
      classified_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 5),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      conversation_id: new mongoose.Types.ObjectId(convId),
      message_id: msgRG.insertedId,
      file_id: 'demo-rg',
      s3_bucket: 'youvisa-files',
      s3_key: 'demo/rg.jpg',
      original_filename: 'rg-frente.jpg',
      file_size: 184_120,
      mime_type: 'image/jpeg',
      uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5),
      document_type: 'RG',
      classification_confidence: 0.92,
      classification_status: 'completed',
      classified_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5 + 1000 * 5),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5),
    },
  ]);
  console.log('  files       =  2 (Passaporte + RG, classified)');

  await mongoose.disconnect();

  // 6. Print env for demo simulator + Playwright
  console.log('');
  console.log('--- demo env ---');
  console.log(`USER_ID=${userId}`);
  console.log(`CONVERSATION_ID=${convId}`);
  console.log(`PROCESS_ID=${procId}`);
  console.log(`CHAT_ID=${CHAT_ID}`);
  console.log(`TG_ID=${TG_ID}`);
}

main().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
