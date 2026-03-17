import { query } from '../config/db.js';
import { comparePassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import { validateCaptcha } from '../services/captchaService.js';
import { writeAuditLog } from '../services/auditService.js';

export async function login(req, res) {
  const { email, password, captchaToken } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const captchaValid = await validateCaptcha(captchaToken);
  if (!captchaValid) return res.status(400).json({ message: 'Captcha validation failed' });
  const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken({ userId: user.id, role: user.role });
  await writeAuditLog({ userId: user.id, action: 'LOGIN', entityType: 'AUTH', detail: { email: user.email }, ipAddress: req.ip });
  res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
}
export async function me(req, res) { res.json({ user: req.user }); }
