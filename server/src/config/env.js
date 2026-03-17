import crypto from 'crypto';

const REQUIRED_VARS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

export function validateEnv(env = process.env) {
  const missing = REQUIRED_VARS.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if ((env.NODE_ENV || 'development') === 'production' && String(env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  return {
    ...env,
    NOTIFICATION_EMAIL_FROM: env.NOTIFICATION_EMAIL_FROM || 'noreply@jakartamax.local',
    SECRET_PROVIDER: env.SECRET_PROVIDER || 'env',
  };
}

export function generateSecureToken(size = 32) {
  return crypto.randomBytes(size).toString('hex');
}
