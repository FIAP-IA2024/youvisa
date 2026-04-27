import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

const env = getEnv();
const BASE = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export interface TelegramFile {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  options?: { parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2' },
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode ?? 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body, chatId }, 'telegram sendMessage failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err, chatId }, 'telegram sendMessage error');
    return false;
  }
}

/**
 * Download a file from Telegram by file_id.
 * Used in the document-upload flow before re-uploading to MinIO.
 */
export async function getFile(fileId: string): Promise<TelegramFile> {
  const metaRes = await fetch(`${BASE}/getFile?file_id=${fileId}`);
  if (!metaRes.ok) {
    throw new Error(`telegram getFile failed: ${metaRes.status}`);
  }
  const meta = await metaRes.json();
  if (!meta.ok || !meta.result?.file_path) {
    throw new Error(`telegram getFile invalid response: ${JSON.stringify(meta)}`);
  }
  const filePath = meta.result.file_path as string;
  const downloadUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`telegram file download failed: ${fileRes.status}`);
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const fileName = filePath.split('/').pop() || 'file';
  const mimeType = guessMimeType(fileName);
  return { bytes: buffer, mimeType, fileName };
}

/**
 * Set the bot's webhook URL. Called once at startup with the agent's
 * publicly reachable URL (typically an ngrok tunnel pointing at /telegram/webhook).
 */
export async function setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, drop_pending_updates: true }),
  });
  const body = (await res.json()) as { ok: boolean; description?: string };
  return body;
}

export async function deleteWebhook(): Promise<boolean> {
  const res = await fetch(`${BASE}/deleteWebhook`, { method: 'POST' });
  return res.ok;
}

function guessMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}
