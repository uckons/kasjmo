import { query } from '../config/db.js';
import { writeAuditLog } from '../services/auditService.js';

export async function listCategories(req, res) {
  const result = await query(
    `SELECT id, cash_type, name, description, color, is_active, created_at
     FROM transaction_categories
     ORDER BY cash_type ASC, id ASC`
  );
  res.json(result.rows);
}

export async function createCategory(req, res) {
  const { cashType, name, description, color } = req.body;
  if (!cashType || !name) return res.status(400).json({ message: 'cashType and name are required' });

  const result = await query(
    `INSERT INTO transaction_categories (cash_type, name, description, color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, cash_type, name, description, color, is_active, created_at`,
    [cashType, name, description || '', color || '#3B82F6']
  );

  await writeAuditLog({ userId: req.user.id, action: 'CREATE_CATEGORY', entityType: 'CATEGORY', entityId: result.rows[0].id, detail: result.rows[0], ipAddress: req.ip });
  res.status(201).json(result.rows[0]);
}

export async function toggleCategoryStatus(req, res) {
  const categoryId = Number(req.params.id);
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be boolean' });

  const result = await query(
    `UPDATE transaction_categories
     SET is_active = $1
     WHERE id = $2
     RETURNING id, cash_type, name, description, color, is_active, created_at`,
    [isActive, categoryId]
  );

  if (!result.rows[0]) return res.status(404).json({ message: 'Category not found' });

  await writeAuditLog({ userId: req.user.id, action: isActive ? 'ENABLE_CATEGORY' : 'DISABLE_CATEGORY', entityType: 'CATEGORY', entityId: categoryId, detail: { isActive }, ipAddress: req.ip });
  res.json(result.rows[0]);
}
