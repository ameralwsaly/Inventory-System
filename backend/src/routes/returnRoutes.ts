import { Router } from 'express';
import { getReturns, getReturnItems, createReturn, approveReturn, fulfillReturn } from '../controllers/returnController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate); // Protect all routes

router.get('/', getReturns);
router.get('/:id/items', getReturnItems);

// Requesters can create returns
router.post('/', authorize(['requester', 'manager', 'gm_supply', 'admin']), createReturn);

// Managers, GMs can approve
router.put('/:id/approve', authorize(['manager', 'gm_supply', 'admin']), approveReturn);

// Storekeepers fulfill
router.put('/:id/fulfill', authorize(['storekeeper', 'admin']), fulfillReturn);

export default router;
