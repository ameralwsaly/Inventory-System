import { Router } from 'express';
import { getDepartments, getDepartmentUsers, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getDepartments);
router.get('/:id/users', authenticate, authorize(['admin']), getDepartmentUsers);
router.post('/', authenticate, authorize(['admin']), createDepartment);
router.put('/:id', authenticate, authorize(['admin']), updateDepartment);
router.delete('/:id', authenticate, authorize(['admin']), deleteDepartment);

export default router;
