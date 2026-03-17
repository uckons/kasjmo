import { query } from '../config/db.js';
export async function writeAuditLog({ userId = null, action, entityType, entityId = null, detail = null, ipAddress = null }) {
  await query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, detail, ip_address) VALUES ($1, $2, $3, $4, $5, $6)`, [userId, action, entityType, entityId, detail ? JSON.stringify(detail) : null, ipAddress]);
}
