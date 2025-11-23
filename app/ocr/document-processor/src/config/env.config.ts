import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import envVar from 'env-var';

// Load .env in development
if (process.env.NODE_ENV !== 'production') {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
  ];
  const envPath = possiblePaths.find((p) => fs.existsSync(p));
  if (envPath) {
    config({ path: envPath });
  }
}

export class EnvConfig {
  // Try prefixed version first, fallback to unprefixed for backwards compatibility
  public readonly NODE_ENV = envVar
    .get('OCR_DOCUMENT_PROCESSOR_NODE_ENV')
    .default(envVar.get('NODE_ENV').default('development').asString())
    .asString();
  public readonly IS_PRODUCTION = this.NODE_ENV === 'production';
  public readonly MODE = envVar
    .get('OCR_DOCUMENT_PROCESSOR_MODE')
    .default(envVar.get('MODE').default('lambda').asString())
    .asString();

  // MongoDB (shared, no prefix)
  public readonly MONGODB_URI = envVar.get('MONGODB_URI').required().asString();
  public readonly MONGODB_DATABASE = envVar.get('MONGODB_DATABASE').default('dev').asString();

  // AWS (shared, no prefix - Lambda sets AWS_REGION automatically)
  public readonly AWS_REGION = envVar.get('AWS_REGION').default('sa-east-1').asString();
  public readonly AWS_TEXTRACT_REGION = envVar.get('AWS_TEXTRACT_REGION').default('us-east-1').asString();
  public readonly USE_MOCK_TEXTRACT = envVar
    .get('OCR_DOCUMENT_PROCESSOR_USE_MOCK_TEXTRACT')
    .default(envVar.get('USE_MOCK_TEXTRACT').default('false').asString())
    .asBool();

  // Local mode
  public readonly WATCH_DIR = envVar
    .get('OCR_DOCUMENT_PROCESSOR_WATCH_DIR')
    .default(envVar.get('WATCH_DIR').default('./watch').asString())
    .asString();
  public readonly API_PORT = envVar
    .get('OCR_DOCUMENT_PROCESSOR_PORT')
    .default(envVar.get('API_PORT').default('5556').asString())
    .asPortNumber();
}

export const env = new EnvConfig();
