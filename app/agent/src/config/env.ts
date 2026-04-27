import { z } from 'zod';

const envSchema = z.object({
  AGENT_PORT: z.coerce.number().default(7777),

  // MongoDB
  MONGODB_URI: z.string().default('mongodb://mongo:27017'),
  MONGODB_DATABASE: z.string().default('youvisa'),

  // MinIO / S3
  S3_ENDPOINT: z.string().default('http://minio:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('youvisa-files'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string(),

  // Portal JWT
  PORTAL_SECRET: z.string().min(32, 'PORTAL_SECRET must be at least 32 chars'),
  PORTAL_TTL_HOURS: z.coerce.number().default(24),
  PORTAL_BASE_URL: z.string().url().default('http://localhost:3000'),

  // API (the existing Fastify backend)
  API_URL: z.string().url().default('http://api:5555'),
  API_KEY: z.string(),

  // Validation service (FastAPI + OpenCV — Sprint 4 Phase 7)
  VALIDATION_URL: z.string().url().default('http://validation:5556'),

  // Claude Agent SDK
  CLAUDE_MODEL: z.string().default('claude-haiku-4-5'),
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.string().default('development'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;
export function getEnv(): Env {
  if (!_env) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    _env = parsed.data;
  }
  return _env;
}
