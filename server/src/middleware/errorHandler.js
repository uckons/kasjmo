export function errorHandler(err, req, res, next) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
}
