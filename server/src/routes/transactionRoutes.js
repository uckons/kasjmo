import { Router } from 'express';
import { listTransactions, createTransaction, updateTransaction, deleteTransaction, approveTransaction } from '../controllers/transactionController.js';
import { requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireRoles('admin', 'bendahara', 'approver'), listTransactions);
router.post('/', requireRoles('admin', 'bendahara'), createTransaction);
router.put('/:id', requireRoles('admin', 'bendahara'), updateTransaction);
router.delete('/:id', requireRoles('admin', 'bendahara'), deleteTransaction);
router.post('/:id/approve', requireRoles('admin', 'approver'), approveTransaction);

export default router;
