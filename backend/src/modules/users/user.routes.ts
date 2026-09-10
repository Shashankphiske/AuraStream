import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { updateInterestsSchema, updateProfileSchema } from './user.validation.js';

const router = Router();

router.use(authenticate);

router.get('/me', UserController.getMe);
router.patch('/me/interests', validateBody(updateInterestsSchema), UserController.updateInterests);
router.patch('/me/profile', validateBody(updateProfileSchema), UserController.updateProfile);

export const userRoutes = router;
