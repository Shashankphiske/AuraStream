import { Router } from 'express';
import { FavoriteController } from './favorite.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', FavoriteController.getMine);
router.post('/toggle', FavoriteController.toggle);
router.get('/check/:trackId', FavoriteController.checkStatus);

export const favoriteRoutes = router;
