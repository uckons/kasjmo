import { query } from '../config/db.js';
import { writeAuditLog } from '../services/auditService.js';
function normalizeTransactionPayload(body) { return { cashType: body.cashType, flow: body.flow, amount: Number(body.amount), category: body.category || 'General', description: body.description || '', transactionDate: body.transactionDate || new Date().toISOString().slice(0, 10) }; }
export async function listTransactions(req, res) {
  const { cashType, flow, status, fromDate, toDate } = req.query; const clauses = []; const params = [];
  if (cashType) { params.push(cashType); clauses.push(`t.cash_type = $${params.length}`); }
  if (flow) { params.push(flow); clauses.push(`t.flow = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`t.status = $${params.length}`); }
  if (fromDate) { params.push(fromDate); clauses.push(`t.transaction_date >= $${params.length}`); }
  if (toDate) { params.push(toDate); clauses.push(`t.transaction_date <= $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await query(`SELECT t.*, u.full_name AS created_by_name, COALESCE((SELECT json_agg(json_build_object('id', a.id, 'approverId', a.approver_id, 'approverName', au.full_name, 'decision', a.decision, 'comment', a.comment, 'approvedAt', a.approved_at) ORDER BY a.id) FROM approvals a JOIN users au ON au.id = a.approver_id WHERE a.transaction_id = t.id), '[]'::json) AS approvals FROM transactions t JOIN users u ON u.id = t.created_by ${where} ORDER BY t.transaction_date DESC, t.id DESC`, params);
  res.json(result.rows);
}
export async function createTransaction(req, res) {
  const payload = normalizeTransactionPayload(req.body); if (!payload.cashType || !payload.flow || !payload.amount || payload.amount <= 0) return res.status(400).json({ message: 'Invalid payload' });
  let status = 'approved'; const requiresApproval = payload.cashType === 'kas_besar' && payload.flow === 'expense'; if (requiresApproval) status = 'pending_approval';
  const result = await query(`INSERT INTO transactions (cash_type, flow, amount, category, description, transaction_date, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [payload.cashType, payload.flow, payload.amount, payload.category, payload.description, payload.transactionDate, status, req.user.id]);
  const transaction = result.rows[0];
  await writeAuditLog({ userId: req.user.id, action: 'CREATE_TRANSACTION', entityType: 'TRANSACTION', entityId: transaction.id, detail: transaction, ipAddress: req.ip });
  res.status(201).json(transaction);
}
export async function approveTransaction(req, res) {
  const transactionId = Number(req.params.id); const { decision, comment } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Decision must be approved or rejected' });
  const txResult = await query('SELECT * FROM transactions WHERE id = $1', [transactionId]); const transaction = txResult.rows[0];
  if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
  if (!(transaction.cash_type === 'kas_besar' && transaction.flow === 'expense')) return res.status(400).json({ message: 'This transaction does not require approval' });
  if (transaction.status === 'rejected') return res.status(400).json({ message: 'Transaction already rejected' });
  if (transaction.status === 'approved') return res.status(400).json({ message: 'Transaction already fully approved' });
  const existingDecision = await query('SELECT id FROM approvals WHERE transaction_id = $1 AND approver_id = $2', [transactionId, req.user.id]);
  if (existingDecision.rows.length > 0) return res.status(400).json({ message: 'You already made a decision for this transaction' });
  await query(`INSERT INTO approvals (transaction_id, approver_id, decision, comment, approved_at) VALUES ($1,$2,$3,$4,NOW())`, [transactionId, req.user.id, decision, comment || null]);
  const approvals = await query(`SELECT decision, COUNT(*)::int AS total FROM approvals WHERE transaction_id = $1 GROUP BY decision`, [transactionId]);
  const summary = approvals.rows.reduce((acc, row) => { acc[row.decision] = row.total; return acc; }, {}); let newStatus = 'pending_approval'; if ((summary.rejected || 0) > 0) newStatus = 'rejected'; else if ((summary.approved || 0) >= 3) newStatus = 'approved';
  await query('UPDATE transactions SET status = $1 WHERE id = $2', [newStatus, transactionId]);
  await writeAuditLog({ userId: req.user.id, action: decision === 'approved' ? 'APPROVE_TRANSACTION' : 'REJECT_TRANSACTION', entityType: 'TRANSACTION', entityId: transactionId, detail: { decision, comment, newStatus }, ipAddress: req.ip });
  const updated = await query('SELECT * FROM transactions WHERE id = $1', [transactionId]); res.json(updated.rows[0]);
}
