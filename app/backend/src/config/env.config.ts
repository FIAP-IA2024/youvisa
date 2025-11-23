import { config } from 'dotenv';
import envVar from 'env-var';
import { injectable } from 'tsyringe';

config();

@injectable()
export class EnvConfig {
  public readonly NODE_ENV = envVar.get('NODE_ENV').default('development').asString();
  public readonly IS_PRODUCTION = this.NODE_ENV === 'production';
  public readonly IS_DEBUG = envVar.get('IS_DEBUG').default('false').asBool();

  // API Configuration
  public readonly API_HOST = envVar.get('API_HOST').default('0.0.0.0').asString();
  public readonly API_PORT = envVar.get('API_PORT').default('3000').asPortNumber();

  // MongoDB Configuration
  public readonly MONGODB_URI = envVar
    .get('MONGODB_URI')
    .required()
    .asString();
  public readonly MONGODB_DATABASE = envVar
    .get('MONGODB_DATABASE')
    .default('youvisa')
    .asString();

  // AWS Configuration
  public readonly AWS_REGION = envVar.get('AWS_REGION').default('sa-east-1').asString();
  public readonly S3_BUCKET_NAME = envVar.get('S3_BUCKET_NAME').required().asString();
}
