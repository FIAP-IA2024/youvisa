/**
 * Smoke test for the document flow (validate -> MinIO -> classify -> notify).
 * Bypasses Telegram by calling handleDocument() directly with a local image.
 *
 * Usage: docker exec youvisa-agent npx tsx src/scripts/smoke-document-flow.ts /path/in/container/to/image.jpg
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { connectMongo, disconnectMongo } from '@/db/mongo';
import { ConversationModel, UserModel } from '@/db/repositories';
import { handleDocument } from '@/classifier/document-flow';
import { saveMessage } from '@/lib/api-client';

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Usage: tsx src/scripts/smoke-document-flow.ts <image_path>');
    process.exit(1);
  }

  const bytes = await fs.readFile(imagePath);
  const fileName = path.basename(imagePath);
  const mime = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  await connectMongo();

  const user = await UserModel().create({
    telegram_id: `doc-smoke-${Date.now()}`,
    first_name: 'DocSmoke',
    is_bot: false,
  });
  const conv = await ConversationModel().create({
    user_id: user._id,
    channel: 'telegram',
    chat_id: `doc-smoke-${Date.now()}`,
    status: 'active',
  });

  // Save a Message first so the File can reference its ObjectId
  const savedMsg = await saveMessage({
    conversation_id: String(conv._id),
    message_id: `tg-${Date.now()}`,
    user_id: String(user._id),
    message_type: 'photo',
    direction: 'incoming',
  });

  console.log(`Sending ${imagePath} (${bytes.length} bytes, ${mime})`);
  const t0 = Date.now();
  const result = await handleDocument({
    imageBytes: bytes,
    mimeType: mime,
    fileName,
    telegramFileId: `tg-fake-${Date.now()}`,
    conversation_id: String(conv._id),
    message_object_id: savedMsg._id,
    user_id: String(user._id),
    chat_id: conv.chat_id,
  });
  console.log(`Done in ${Date.now() - t0}ms`);
  console.log('Result:', JSON.stringify(result, null, 2));

  // Cleanup
  await UserModel().findByIdAndDelete(user._id);
  await ConversationModel().findByIdAndDelete(conv._id);
  await disconnectMongo();
  console.log('✅ smoke document flow OK');
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
