process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
process.env.JWT_EXPIRATION_TIME = process.env.JWT_EXPIRATION_TIME || '1h';
process.env.JWT_REFRESH_EXPIRATION_TIME =
  process.env.JWT_REFRESH_EXPIRATION_TIME || '7d';

// Required by constants.ts at import time.
process.env.EMAIL_ENCRYPTION_KEY =
  process.env.EMAIL_ENCRYPTION_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.EMAIL_BLIND_INDEX_SECRET =
  process.env.EMAIL_BLIND_INDEX_SECRET || 'test-blind-index-secret';

// Required by Google strategy constructor.
process.env.GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/redirect';
