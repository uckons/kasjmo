import { Router } from 'express';
import { getReportData, exportXlsx, exportPdf } from '../controllers/reportController.js';
import { requireRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireRoles('admin', 'bendahara', 'approver', 'viewer'), getReportData);
router.get('/export/xlsx', requireRoles('admin', 'bendahara'), exportXlsx);
router.get('/export/pdf', requireRoles('admin', 'bendahara'), exportPdf);

export default router;
