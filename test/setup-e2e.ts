// E2E Test Setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://nestjs_user:nestjs_password@localhost:5432/nestjs_postgres';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRATION_TIME = '1h';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_REFRESH_EXPIRATION_TIME = '7d';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/redirect';
process.env.GOOGLE_IOS_CLIENT_ID =
  process.env.GOOGLE_IOS_CLIENT_ID || 'test-google-ios-client-id';
process.env.GOOGLE_ANDROID_CLIENT_ID =
  process.env.GOOGLE_ANDROID_CLIENT_ID || 'test-google-android-client-id';

// Required encryption keys for email handling
process.env.EMAIL_ENCRYPTION_KEY =
  process.env.EMAIL_ENCRYPTION_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.EMAIL_BLIND_INDEX_SECRET =
  process.env.EMAIL_BLIND_INDEX_SECRET || 'test-blind-index-secret';

// Increase timeout for all tests
jest.setTimeout(60000);
