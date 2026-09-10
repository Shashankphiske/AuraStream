import { Router } from 'express';
import { TrackController } from './track.controller.js';
import { searchLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

router.get('/trending', TrackController.getTrending);
router.get('/categories', TrackController.getGenres);
router.get('/genre/:genre', TrackController.getByGenre);
router.get('/mood/:moodId', TrackController.getByMood);
router.get('/search', searchLimiter, TrackController.search);
router.get('/track/:id', TrackController.getDetails);

export const musicRoutes = router;
