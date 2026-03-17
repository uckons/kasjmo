import { query } from '../config/db.js';

export async function listAuditLogs(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const offset = (page - 1) * limit;

  const totalResult = await query('SELECT COUNT(*)::int AS total FROM audit_logs');
  const total = totalResult.rows[0].total;

  const result = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.ip_address, a.created_at, u.full_name, u.email, u.role
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    rows: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
}
