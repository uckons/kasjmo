import { Router } from 'express';
import { listUsers, createUser } from '../controllers/userController.js';
import { requireRoles } from '../middleware/auth.js';
const router = Router(); router.get('/', requireRoles('admin'), listUsers); router.post('/', requireRoles('admin'), createUser); export default router;
