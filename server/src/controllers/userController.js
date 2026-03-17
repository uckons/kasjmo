import { query } from '../config/db.js';
import { hashPassword } from '../utils/hash.js';
import { writeAuditLog } from '../services/auditService.js';

const allowedRoles = ['admin', 'bendahara', 'approver'];

export async function listUsers(req, res) {
  const result = await query(`SELECT id, full_name, email, role, is_active, created_at FROM users WHERE deleted_at IS NULL ORDER BY id ASC`);
  res.json(result.rows);
}

export async function createUser(req, res) {
  const { fullName, email, role, password } = req.body;
  if (!fullName || !email || !role || !password) return res.status(400).json({ message: 'Missing fields' });
  if (!allowedRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (full_name, email, role, password_hash)
     VALUES ($1,$2,$3,$4)
     RETURNING id, full_name, email, role, is_active, created_at`,
    [fullName, email.toLowerCase(), role, passwordHash]
  );

  await writeAuditLog({ userId: req.user.id, action: 'CREATE_USER', entityType: 'USER', entityId: result.rows[0].id, detail: result.rows[0], ipAddress: req.ip });
  res.status(201).json(result.rows[0]);
}

export async function updateUser(req, res) {
  const userId = Number(req.params.id);
  const { fullName, email, role, password } = req.body;

  if (!fullName || !email || !role) return res.status(400).json({ message: 'Missing fields' });
  if (!allowedRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

  const existing = await query('SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [userId]);
  if (!existing.rows[0]) return res.status(404).json({ message: 'User not found' });

  const values = [fullName, email.toLowerCase(), role, userId];
  let sql = `UPDATE users SET full_name = $1, email = $2, role = $3`;

  if (password) {
    const passwordHash = await hashPassword(password);
    values.splice(3, 0, passwordHash);
    sql += `, password_hash = $4 WHERE id = $5 AND deleted_at IS NULL`;
  } else {
    sql += ` WHERE id = $4 AND deleted_at IS NULL`;
  }

  const result = await query(`${sql} RETURNING id, full_name, email, role, is_active, created_at`, values);
  await writeAuditLog({ userId: req.user.id, action: 'UPDATE_USER', entityType: 'USER', entityId: userId, detail: result.rows[0], ipAddress: req.ip });
  res.json(result.rows[0]);
}

export async function setUserStatus(req, res) {
  const userId = Number(req.params.id);
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be boolean' });
  if (userId === req.user.id && !isActive) return res.status(400).json({ message: 'You cannot disable your own account' });

  const result = await query(
    `UPDATE users SET is_active = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, full_name, email, role, is_active, created_at`,
    [isActive, userId]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });

  await writeAuditLog({ userId: req.user.id, action: isActive ? 'ENABLE_USER' : 'DISABLE_USER', entityType: 'USER', entityId: userId, detail: { isActive }, ipAddress: req.ip });
  res.json(result.rows[0]);
}

export async function deleteUser(req, res) {
  const userId = Number(req.params.id);
  if (userId === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account' });

  const result = await query(
    `UPDATE users
      SET is_active = false,
          deleted_at = NOW(),
          email = CONCAT('deleted+', id::text, '+', EXTRACT(EPOCH FROM NOW())::bigint::text, '@local.invalid')
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING id, full_name, email`,
    [userId]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });

  await writeAuditLog({ userId: req.user.id, action: 'DELETE_USER', entityType: 'USER', entityId: userId, detail: result.rows[0], ipAddress: req.ip });
  res.json({ message: 'User deleted' });
}


export async function adminResetUserPassword(req, res) {
  const userId = Number(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ message: 'New password minimum 8 characters' });
  }

  const passwordHash = await hashPassword(newPassword);
  const result = await query(
    `UPDATE users
      SET password_hash = $1,
          failed_login_attempts = 0,
          locked_until = NULL
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, full_name, email`,
    [passwordHash, userId]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });

  await writeAuditLog({
    userId: req.user.id,
    action: 'ADMIN_RESET_USER_PASSWORD',
    entityType: 'USER',
    entityId: userId,
    detail: { targetUser: result.rows[0].email },
    ipAddress: req.ip
  });

  return res.json({ message: 'Password user berhasil direset' });
}
