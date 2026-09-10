import { Router } from 'express';
import { HistoryController } from './history.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', HistoryController.getMine);
router.post('/', HistoryController.logPlay);
router.delete('/', HistoryController.clear);
router.get('/stats', HistoryController.getStats);

export const historyRoutes = router;
