import { Router } from 'express';
import { getItems, createItem, updateItem, importItemsExcel } from '../controllers/itemController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.get('/', authenticate, getItems);
router.post('/', authenticate, authorize(['admin', 'storekeeper', 'manager', 'gm_supply']), createItem);
router.put('/:id', authenticate, authorize(['admin', 'storekeeper', 'manager', 'gm_supply']), updateItem);
router.post('/import', authenticate, authorize(['admin']), upload.single('file'), importItemsExcel);

export default router;
