import { Router } from 'express';
import { listCategories, createCategory, toggleCategoryStatus } from '../controllers/categoryController.js';
import { requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireRoles('admin', 'bendahara', 'approver', 'viewer'), listCategories);
router.post('/', requireRoles('admin', 'bendahara'), createCategory);
router.patch('/:id/status', requireRoles('admin', 'bendahara'), toggleCategoryStatus);

export default router;
