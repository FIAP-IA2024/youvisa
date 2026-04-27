import fs from 'node:fs/promises';
import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

const CLASSIFY_SYSTEM_PROMPT = `Você é um classificador de documentos da plataforma YOUVISA.
Analise a imagem fornecida e identifique qual documento ela representa.
Responda com APENAS uma das seguintes categorias (sem explicação, sem prefixo):

Passaporte
RG
Comprovante
Formulário
Documento inválido

Responda apenas o nome da categoria. Nada mais.`;

const VALID_CATEGORIES = [
  'Passaporte',
  'RG',
  'Comprovante',
  'Formulário',
  'Documento inválido',
] as const;

export type DocumentCategory = (typeof VALID_CATEGORIES)[number];

export interface ClassificationResult {
  document_type: DocumentCategory;
  confidence: number;
  raw: string;
  duration_ms: number;
}

const CREDENTIALS_PATH = '/home/node/.claude/.credentials.json';
let _accessToken: string | undefined;

/**
 * Reads the OAuth access token from the Claude Code credentials file
 * (created by `claude setup-token` or by copying the host's credentials
 * into the claude_home volume).
 *
 * The Claude Agent SDK doesn't support multimodal (vision) inputs as of
 * v0.2.x — its `prompt` parameter is `string`. For vision we hit the
 * Anthropic Messages API directly with the same OAuth token the SDK
 * uses internally.
 */
async function getAccessToken(): Promise<string> {
  if (_accessToken) return _accessToken;
  // Allow env-var override (CLAUDE_CODE_OAUTH_TOKEN) for token-based auth.
  const env = getEnv();
  if (env.CLAUDE_CODE_OAUTH_TOKEN) {
    _accessToken = env.CLAUDE_CODE_OAUTH_TOKEN;
    return _accessToken;
  }
  try {
    const raw = await fs.readFile(CREDENTIALS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const token = parsed?.claudeAiOauth?.accessToken;
    if (typeof token !== 'string' || token.length < 20) {
      throw new Error('access token not found in credentials');
    }
    _accessToken = token;
    return token;
  } catch (err) {
    throw new Error(
      `cannot read claude credentials at ${CREDENTIALS_PATH}: ${(err as Error).message}. ` +
        'Run "docker compose run --rm agent claude setup-token" first.',
    );
  }
}

/**
 * Classify a document image into one of the YOUVISA categories using
 * Claude's multimodal vision capability via the Messages API.
 */
export async function classifyDocumentImage(
  imageBytes: Buffer,
  mimeType: string,
): Promise<ClassificationResult> {
  const env = getEnv();
  const token = await getAccessToken();
  const base64 = imageBytes.toString('base64');

  const t0 = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'oauth-2025-04-20',
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL,
      max_tokens: 50,
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64,
              },
            },
            { type: 'text', text: 'Classifique este documento.' },
          ],
        },
      ],
    }),
  });
  const duration_ms = Date.now() - t0;

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, 'claude vision API error');
    return {
      document_type: 'Documento inválido',
      confidence: 0,
      raw: `error: ${res.status}`,
      duration_ms,
    };
  }

  const data = await res.json();
  const raw = (data?.content?.[0]?.text ?? '').trim();

  // Normalize against allowed categories
  const matched =
    VALID_CATEGORIES.find((c) => raw.toLowerCase() === c.toLowerCase()) ??
    VALID_CATEGORIES.find((c) => raw.toLowerCase().includes(c.toLowerCase()));

  if (!matched) {
    logger.warn({ raw }, 'classifier returned unrecognized category');
    return {
      document_type: 'Documento inválido',
      confidence: 0,
      raw,
      duration_ms,
    };
  }

  return {
    document_type: matched,
    confidence: raw.toLowerCase() === matched.toLowerCase() ? 0.95 : 0.7,
    raw,
    duration_ms,
  };
}
