import { Router } from 'express';
import { generateVoucher, getReportRequests } from '../controllers/reportController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getReportRequests);
router.post('/voucher', authenticate, generateVoucher);

export default router;
