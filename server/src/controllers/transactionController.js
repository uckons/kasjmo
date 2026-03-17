import fs from 'fs';
import path from 'path';
import { query } from '../config/db.js';
import { writeAuditLog } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';

function normalizeTransactionPayload(body) {
  return {
    cashType: body.cashType,
    flow: body.flow,
    amount: Number(body.amount),
    category: body.category || 'General',
    description: body.description || '',
    transactionDate: body.transactionDate || new Date().toISOString().slice(0, 10),
  };
}

function resolveStatus(payload) {
  return payload.cashType === 'kas_besar' && payload.flow === 'expense' ? 'pending_approval' : 'approved';
}

export async function listTransactions(req, res) {
  const { cashType, flow, status, fromDate, toDate } = req.query;
  const clauses = [];
  const params = [];
  if (cashType) { params.push(cashType); clauses.push(`t.cash_type = $${params.length}`); }
  if (flow) { params.push(flow); clauses.push(`t.flow = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`t.status = $${params.length}`); }
  if (fromDate) { params.push(fromDate); clauses.push(`t.transaction_date >= $${params.length}`); }
  if (toDate) { params.push(toDate); clauses.push(`t.transaction_date <= $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await query(
    `SELECT t.*, u.full_name AS created_by_name,
      COALESCE((
        SELECT json_agg(json_build_object('id', a.id, 'approverId', a.approver_id, 'approverName', au.full_name, 'decision', a.decision, 'comment', a.comment, 'approvedAt', a.approved_at) ORDER BY a.id)
        FROM approvals a
        JOIN users au ON au.id = a.approver_id
        WHERE a.transaction_id = t.id
      ), '[]'::json) AS approvals
    FROM transactions t
    JOIN users u ON u.id = t.created_by
    ${where}
    ORDER BY t.transaction_date DESC, t.id DESC`,
    params
  );
  res.json(result.rows);
}

export async function createTransaction(req, res) {
  const payload = normalizeTransactionPayload(req.body);
  if (!payload.cashType || !payload.flow || !payload.amount || payload.amount <= 0) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const status = resolveStatus(payload);

  let proofFilePath = null;
  if (req.body.proofFileBase64 && req.body.proofFileName) {
    const uploadDir = path.resolve(process.cwd(), 'uploads/transaction-proofs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const cleanName = req.body.proofFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${cleanName}`;
    const destination = path.join(uploadDir, filename);
    const fileBuffer = Buffer.from(req.body.proofFileBase64, 'base64');
    if (fileBuffer.length > 2 * 1024 * 1024) return res.status(400).json({ message: 'Proof file too large (max 2MB)' });
    fs.writeFileSync(destination, fileBuffer);
    proofFilePath = `/uploads/transaction-proofs/${filename}`;
  }

  const result = await query(
    `INSERT INTO transactions (cash_type, flow, amount, category, description, transaction_date, status, created_by, proof_file_path)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [payload.cashType, payload.flow, payload.amount, payload.category, payload.description, payload.transactionDate, status, req.user.id, proofFilePath]
  );

  const transaction = result.rows[0];
  await writeAuditLog({ userId: req.user.id, action: 'CREATE_TRANSACTION', entityType: 'TRANSACTION', entityId: transaction.id, detail: transaction, ipAddress: req.ip });

  const approvers = await query(`SELECT full_name, email FROM users WHERE role = 'approver' AND is_active = true`);
  for (const approver of approvers.rows) {
    await notifyUser({ user: approver, subject: `Transaksi baru #${transaction.id}`, body: `Ada transaksi ${transaction.cash_type}/${transaction.flow} senilai ${transaction.amount} yang membutuhkan tindak lanjut.` });
  }

  res.status(201).json(transaction);
}

export async function updateTransaction(req, res) {
  const transactionId = Number(req.params.id);
  const payload = normalizeTransactionPayload(req.body);
  if (!payload.cashType || !payload.flow || !payload.amount || payload.amount <= 0) return res.status(400).json({ message: 'Invalid payload' });

  const txResult = await query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
  const existing = txResult.rows[0];
  if (!existing) return res.status(404).json({ message: 'Transaction not found' });

  const nextStatus = resolveStatus(payload);
  const result = await query(
    `UPDATE transactions
       SET cash_type = $1, flow = $2, amount = $3, category = $4, description = $5, transaction_date = $6, status = $7
     WHERE id = $8
     RETURNING *`,
    [payload.cashType, payload.flow, payload.amount, payload.category, payload.description, payload.transactionDate, nextStatus, transactionId]
  );

  if (nextStatus === 'pending_approval') await query('DELETE FROM approvals WHERE transaction_id = $1', [transactionId]);

  await writeAuditLog({ userId: req.user.id, action: 'UPDATE_TRANSACTION', entityType: 'TRANSACTION', entityId: transactionId, detail: result.rows[0], ipAddress: req.ip });
  res.json(result.rows[0]);
}

export async function deleteTransaction(req, res) {
  const transactionId = Number(req.params.id);
  const result = await query('DELETE FROM transactions WHERE id = $1 RETURNING id, category, amount', [transactionId]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Transaction not found' });
  await writeAuditLog({ userId: req.user.id, action: 'DELETE_TRANSACTION', entityType: 'TRANSACTION', entityId: transactionId, detail: result.rows[0], ipAddress: req.ip });
  res.json({ message: 'Transaction deleted' });
}

export async function approveTransaction(req, res) {
  const transactionId = Number(req.params.id);
  const { decision, comment } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ message: 'Decision must be approved or rejected' });

  const txResult = await query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
  const transaction = txResult.rows[0];
  if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
  if (!(transaction.cash_type === 'kas_besar' && transaction.flow === 'expense')) return res.status(400).json({ message: 'This transaction does not require approval' });
  if (transaction.status === 'rejected') return res.status(400).json({ message: 'Transaction already rejected' });
  if (transaction.status === 'approved') return res.status(400).json({ message: 'Transaction already fully approved' });

  const existingDecision = await query('SELECT id FROM approvals WHERE transaction_id = $1 AND approver_id = $2', [transactionId, req.user.id]);
  if (existingDecision.rows.length > 0) return res.status(400).json({ message: 'You already made a decision for this transaction' });

  await query(`INSERT INTO approvals (transaction_id, approver_id, decision, comment, approved_at) VALUES ($1,$2,$3,$4,NOW())`, [transactionId, req.user.id, decision, comment || null]);

  const approvals = await query(`SELECT decision, COUNT(*)::int AS total FROM approvals WHERE transaction_id = $1 GROUP BY decision`, [transactionId]);
  const summary = approvals.rows.reduce((acc, row) => { acc[row.decision] = row.total; return acc; }, {});

  let newStatus = 'pending_approval';
  if ((summary.rejected || 0) > 0) newStatus = 'rejected';
  else if ((summary.approved || 0) >= 3) newStatus = 'approved';

  await query('UPDATE transactions SET status = $1 WHERE id = $2', [newStatus, transactionId]);
  await writeAuditLog({ userId: req.user.id, action: decision === 'approved' ? 'APPROVE_TRANSACTION' : 'REJECT_TRANSACTION', entityType: 'TRANSACTION', entityId: transactionId, detail: { decision, comment, newStatus }, ipAddress: req.ip });

  const ownerResult = await query('SELECT full_name, email FROM users WHERE id = $1', [transaction.created_by]);
  if (ownerResult.rows[0]) {
    await notifyUser({ user: ownerResult.rows[0], subject: `Status transaksi #${transactionId}: ${newStatus}`, body: `Transaksi Anda sekarang berstatus ${newStatus}.` });
  }

  res.json({ message: `Decision saved. Current status: ${newStatus}`, status: newStatus });
}
