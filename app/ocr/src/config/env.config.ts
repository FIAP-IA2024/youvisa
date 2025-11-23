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
  public readonly NODE_ENV = envVar.get('NODE_ENV').default('development').asString();
  public readonly IS_PRODUCTION = this.NODE_ENV === 'production';
  public readonly MODE = envVar.get('MODE').default('lambda').asString();

  // MongoDB
  public readonly MONGODB_URI = envVar.get('MONGODB_URI').required().asString();
  public readonly MONGODB_DATABASE = envVar.get('MONGODB_DATABASE').default('dev').asString();

  // AWS
  public readonly AWS_REGION = envVar.get('AWS_REGION').default('sa-east-1').asString();
  public readonly USE_MOCK_TEXTRACT = envVar.get('USE_MOCK_TEXTRACT').default('false').asBool();

  // Local mode
  public readonly WATCH_DIR = envVar.get('WATCH_DIR').default('./watch').asString();
  public readonly API_PORT = envVar.get('API_PORT').default('3001').asPortNumber();
}

export const env = new EnvConfig();
