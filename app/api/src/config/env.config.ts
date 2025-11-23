import fs from 'node:fs';
import path from 'node:path';

import { config } from 'dotenv';
import envVar from 'env-var';
import { injectable } from 'tsyringe';

// Only load .env in development (Lambda has env vars configured)
if (process.env.NODE_ENV !== 'production') {
  // Try to find .env in project root (handles both running from root and from app/api)
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];

  const envPath = possiblePaths.find((p) => fs.existsSync(p));
  if (envPath) {
    config({ path: envPath });
  }
}

@injectable()
export class EnvConfig {
  // Try prefixed version first, fallback to unprefixed for backwards compatibility
  public readonly NODE_ENV = envVar
    .get('API_NODE_ENV')
    .default(envVar.get('NODE_ENV').default('development').asString())
    .asString();
  public readonly IS_PRODUCTION = this.NODE_ENV === 'production';
  public readonly IS_DEBUG = envVar
    .get('API_IS_DEBUG')
    .default(envVar.get('IS_DEBUG').default('false').asString())
    .asBool();

  // API Configuration
  public readonly API_HOST = envVar
    .get('API_HOST')
    .default('0.0.0.0')
    .asString();
  public readonly API_PORT = envVar
    .get('API_PORT')
    .default('5555')
    .asPortNumber();
  public readonly API_KEY = envVar
    .get('API_KEY')
    .required()
    .asString();

  // MongoDB Configuration
  public readonly MONGODB_URI = envVar.get('MONGODB_URI').required().asString();
  public readonly MONGODB_DATABASE = envVar.get('MONGODB_DATABASE').default('youvisa').asString();

  // AWS Configuration
  public readonly AWS_REGION = envVar.get('AWS_REGION').default('sa-east-1').asString();
  public readonly S3_BUCKET_NAME = envVar.get('S3_BUCKET_NAME').required().asString();
}
