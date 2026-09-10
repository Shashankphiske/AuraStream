import { Router } from 'express';
import { RecommendationController } from './recommendation.controller.js';
import { optionalAuthenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/home', optionalAuthenticate, RecommendationController.getHomeFeed);
router.get('/similar/:trackId', RecommendationController.getSimilar);

export const recommendationRoutes = router;
