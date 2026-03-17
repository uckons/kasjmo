import { Router } from 'express';
import { getReportData, exportXlsx, exportPdf } from '../controllers/reportController.js';
const router = Router(); router.get('/', getReportData); router.get('/export/xlsx', exportXlsx); router.get('/export/pdf', exportPdf); export default router;
