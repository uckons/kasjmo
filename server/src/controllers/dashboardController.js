import { query } from '../config/db.js';
export async function getDashboard(req, res) {
  const summary = await query(`SELECT COALESCE(SUM(CASE WHEN flow='income' THEN amount ELSE 0 END),0) AS total_income, COALESCE(SUM(CASE WHEN flow='expense' THEN amount ELSE 0 END),0) AS total_expense FROM transactions WHERE status = 'approved'`);
  const byCashType = await query(`SELECT cash_type, COALESCE(SUM(CASE WHEN flow='income' THEN amount ELSE 0 END),0) AS income, COALESCE(SUM(CASE WHEN flow='expense' THEN amount ELSE 0 END),0) AS expense FROM transactions WHERE status = 'approved' GROUP BY cash_type ORDER BY cash_type`);
  const monthly = await query(`SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS month, COALESCE(SUM(CASE WHEN flow='income' THEN amount ELSE 0 END),0) AS income, COALESCE(SUM(CASE WHEN flow='expense' THEN amount ELSE 0 END),0) AS expense FROM transactions WHERE transaction_date >= CURRENT_DATE - INTERVAL '12 months' AND status = 'approved' GROUP BY TO_CHAR(transaction_date, 'YYYY-MM') ORDER BY month`);
  const pendingBigCash = await query(`SELECT COUNT(*)::int AS total FROM transactions WHERE cash_type='kas_besar' AND flow='expense' AND status='pending_approval'`);
  res.json({ summary: summary.rows[0], byCashType: byCashType.rows, monthly: monthly.rows, pendingBigCash: pendingBigCash.rows[0].total });
}
