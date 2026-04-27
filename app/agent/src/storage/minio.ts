import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

let _client: S3Client | undefined;

export function getS3Client(): S3Client {
  if (_client) return _client;
  const env = getEnv();
  _client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
    forcePathStyle: true, // MinIO requires path-style addressing
  });
  return _client;
}

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ bucket: string; key: string }> {
  const env = getEnv();
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  logger.info({ bucket: env.S3_BUCKET, key, size: body.byteLength }, 'minio upload');
  return { bucket: env.S3_BUCKET, key };
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const env = getEnv();
  const client = getS3Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
  const chunks: Uint8Array[] = [];
  // @ts-expect-error: AWS SDK Body is a stream
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function getSignedDownloadUrl(
  key: string,
  ttlSeconds = 3600,
): Promise<string> {
  const env = getEnv();
  const client = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn: ttlSeconds },
  );
}
