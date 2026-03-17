import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/db.js';
export async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    const result = await query('SELECT id, full_name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL', [decoded.userId]);
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ message: 'User not active' });
    req.user = user; next();
  } catch { return res.status(401).json({ message: 'Invalid token' }); }
}
export function requireRoles(...roles) { return (req, res, next) => { if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' }); next(); }; }
