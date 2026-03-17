import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/env.js';

test('validateEnv throws when required variables missing', () => {
  assert.throws(() => validateEnv({}), /Missing required environment variables/);
});

test('validateEnv enforces strong JWT secret in production', () => {
  assert.throws(
    () => validateEnv({ DB_HOST: 'x', DB_NAME: 'x', DB_USER: 'x', DB_PASSWORD: 'x', JWT_SECRET: 'short', NODE_ENV: 'production' }),
    /at least 32/
  );
});

test('validateEnv accepts complete env set', () => {
  const result = validateEnv({ DB_HOST: 'x', DB_NAME: 'x', DB_USER: 'x', DB_PASSWORD: 'x', JWT_SECRET: '12345678901234567890123456789012' });
  assert.equal(result.SECRET_PROVIDER, 'env');
});
