import crypto from 'crypto';
import { query } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import { validateCaptcha } from '../services/captchaService.js';
import { writeAuditLog } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';

const MAX_FAILED_LOGIN = Number(process.env.MAX_FAILED_LOGIN || 5);
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);
const RESET_TOKEN_MINUTES = Number(process.env.RESET_TOKEN_MINUTES || 30);

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function login(req, res) {
  try {
    const { email, password, captchaToken } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const captchaValid = await validateCaptcha(captchaToken);
    if (!captchaValid) return res.status(400).json({ message: 'Captcha validation failed' });

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ message: 'Account is temporarily locked. Please try later.' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      const attempts = Number(user.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= MAX_FAILED_LOGIN ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
      await query('UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockedUntil, user.id]);
      return res.status(401).json({ message: attempts >= MAX_FAILED_LOGIN ? 'Account locked due to too many failed attempts' : 'Invalid credentials' });
    }

    await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1', [user.id]);
    const token = signToken({ userId: user.id, role: user.role });
    await writeAuditLog({ userId: user.id, action: 'LOGIN', entityType: 'AUTH', detail: { email: user.email }, ipAddress: req.ip });
    return res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Login failed due to server configuration. Please run migration and try again.' });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const userResult = await query('SELECT id, email, full_name FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
    const user = userResult.rows[0];

    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
        [user.id, tokenHash, RESET_TOKEN_MINUTES]
      );

      await notifyUser({
        user,
        subject: 'Password Reset Request',
        body: `Hi ${user.full_name}, reset token Anda: ${rawToken}. Berlaku ${RESET_TOKEN_MINUTES} menit.`,
        whatsappMessage: `Token reset password JMO Anda: ${rawToken}.`
      });
    }

    return res.json({ message: 'If the account exists, reset instructions have been sent' });
  } catch (error) {
    console.error('Request password reset error:', error.message);
    return res.status(500).json({ message: 'Unable to process reset request right now.' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Token and a minimum 8-char password are required' });
    }

    const tokenHash = hashResetToken(token);
    const tokenResult = await query(
      `SELECT prt.id, prt.user_id, u.email, u.full_name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    const record = tokenResult.rows[0];
    if (!record) return res.status(400).json({ message: 'Invalid or expired token' });

    const passwordHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2', [passwordHash, record.user_id]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [record.id]);
    await writeAuditLog({ userId: record.user_id, action: 'RESET_PASSWORD', entityType: 'AUTH', detail: { email: record.email }, ipAddress: req.ip });

    await notifyUser({
      user: record,
      subject: 'Password Changed',
      body: 'Password akun Anda berhasil diubah.',
      whatsappMessage: 'Password akun JMO Anda baru saja diubah.'
    });

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({ message: 'Unable to reset password right now.' });
  }
}

export async function me(req, res) {
  return res.json({ user: req.user });
}
