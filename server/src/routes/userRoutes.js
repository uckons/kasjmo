import { Router } from 'express';
import { listUsers, createUser, updateUser, setUserStatus, deleteUser } from '../controllers/userController.js';
import { requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireRoles('admin'), listUsers);
router.post('/', requireRoles('admin'), createUser);
router.put('/:id', requireRoles('admin'), updateUser);
router.patch('/:id/status', requireRoles('admin'), setUserStatus);
router.delete('/:id', requireRoles('admin'), deleteUser);

export default router;
