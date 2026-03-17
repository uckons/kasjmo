import { query } from '../config/db.js';
export async function listAuditLogs(req, res) { const result = await query(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.detail, a.ip_address, a.created_at, u.full_name, u.email, u.role FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 300`); res.json(result.rows); }
