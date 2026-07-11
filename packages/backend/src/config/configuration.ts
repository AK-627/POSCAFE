import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: 'api',
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'skynether',
  password: process.env.DATABASE_PASSWORD || 'skynether123',
  database: process.env.DATABASE_NAME || 'skynether_development',
  logging: process.env.DATABASE_LOGGING === 'true',
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));

export const rateLimitConfig = registerAs('rateLimit', () => ({
  ttl: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10),
  limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
}));

export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  accessKey: process.env.S3_ACCESS_KEY || 'skynether',
  secretKey: process.env.S3_SECRET_KEY || 'skynether123',
  region: process.env.S3_REGION || 'us-east-1',
  bucketInvoices: process.env.S3_BUCKET_INVOICES || 'skynether-invoices',
  bucketAssets: process.env.S3_BUCKET_ASSETS || 'skynether-assets',
}));

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  from: process.env.EMAIL_FROM || 'noreply@skynether.com',
}));

export const syncConfig = registerAs('sync', () => ({
  heartbeatInterval: parseInt(process.env.SYNC_HEARTBEAT_INTERVAL || '30000', 10),
  conflictResolution: process.env.SYNC_CONFLICT_RESOLUTION || 'timestamp',
}));