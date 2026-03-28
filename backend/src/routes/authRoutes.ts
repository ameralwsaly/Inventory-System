import { Router } from 'express';
import { login, register } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/register', authenticate, authorize(['admin']), register);

export default router;
