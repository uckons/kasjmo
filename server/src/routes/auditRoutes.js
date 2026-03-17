import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { requireRoles } from '../middleware/auth.js';
const router = Router(); router.get('/', requireRoles('admin', 'bendahara'), listAuditLogs); export default router;
