import { Router } from 'express';
import { getRequests, createRequest, approveRequest, fulfillRequest, getRequestItems } from '../controllers/requestController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getRequests);
router.get('/:id/items', authenticate, getRequestItems);
router.post('/', authenticate, createRequest);
router.put('/:id/approve', authenticate, authorize(['manager', 'gm_supply', 'admin']), approveRequest);
router.put('/:id/fulfill', authenticate, authorize(['storekeeper', 'admin']), fulfillRequest);

export default router;
