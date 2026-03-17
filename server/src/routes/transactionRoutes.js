import { Router } from 'express';
import { listTransactions, createTransaction, approveTransaction } from '../controllers/transactionController.js';
import { requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', listTransactions);
router.post('/', requireRoles('admin', 'bendahara'), createTransaction);
router.post('/:id/approve', requireRoles('admin', 'approver'), approveTransaction);

export default router;
