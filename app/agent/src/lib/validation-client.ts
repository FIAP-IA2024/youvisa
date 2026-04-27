import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

const env = getEnv();

export interface ValidationResult {
  valid: boolean;
  reason: string;
  details: {
    blur_score?: number;
    brightness?: number;
    width?: number;
    height?: number;
  };
}

/**
 * POSTs the image to the validation FastAPI service.
 * Returns the result; on transport error, returns valid=true (fail-open
 * for image quality so we don't block the user — Phase 6 governance:
 * we'd rather classify a slightly-blurry image than block document
 * upload entirely on a service hiccup).
 */
export async function validateImage(
  imageBytes: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ValidationResult> {
  try {
    const fd = new FormData();
    fd.append(
      'file',
      new Blob([new Uint8Array(imageBytes)], { type: mimeType }),
      fileName,
    );

    const res = await fetch(`${env.VALIDATION_URL}/validate`, {
      method: 'POST',
      headers: { 'x-api-key': env.API_KEY },
      body: fd,
    });

    if (!res.ok) {
      logger.warn(
        { status: res.status, body: await res.text() },
        'validation service returned non-OK; fail-open',
      );
      return {
        valid: true,
        reason: 'validation service degraded',
        details: {},
      };
    }
    return (await res.json()) as ValidationResult;
  } catch (err) {
    logger.warn({ err }, 'validation service unreachable; fail-open');
    return {
      valid: true,
      reason: 'validation service unreachable',
      details: {},
    };
  }
}
