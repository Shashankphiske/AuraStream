import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/platform', AnalyticsController.getPlatform);
router.get('/me', authenticate, AnalyticsController.getMine);

export const analyticsRoutes = router;
