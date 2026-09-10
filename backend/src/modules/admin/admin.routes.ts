import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole(['admin']));

router.get('/overview', AdminController.getOverview);
router.get('/users', AdminController.getUsers);
router.delete('/users/:id', AdminController.deleteUser);

export const adminRoutes = router;
