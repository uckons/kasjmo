const buckets = new Map();

function createLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }
    current.count += 1;
    buckets.set(key, current);

    if (current.count > max) {
      return res.status(429).json({ message });
    }
    return next();
  };
}

export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  message: 'Too many authentication requests. Try again later.'
});

export const passwordResetRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RESET_RATE_LIMIT_MAX || 5),
  message: 'Too many reset requests. Try again later.'
});
