import { Router } from 'express';
import { YouTubeController } from './youtube.controller.js';
import { searchLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

router.get('/search', searchLimiter, YouTubeController.search);
router.get('/track/:videoId', YouTubeController.getDetails);

export const youtubeRoutes = router;
