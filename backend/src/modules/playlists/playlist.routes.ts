import { Router } from 'express';
import { PlaylistController } from './playlist.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { createPlaylistSchema, updatePlaylistSchema, addTrackToPlaylistSchema } from './playlist.validation.js';

const router = Router();

// Public / optional auth routes
router.get('/featured', PlaylistController.getFeatured);
router.get('/:id', optionalAuthenticate, PlaylistController.getById);

// Authenticated routes
router.use(authenticate);
router.get('/', PlaylistController.getMine);
router.post('/', validateBody(createPlaylistSchema), PlaylistController.create);
router.patch('/:id', validateBody(updatePlaylistSchema), PlaylistController.update);
router.delete('/:id', PlaylistController.delete);
router.post('/:id/tracks', validateBody(addTrackToPlaylistSchema), PlaylistController.addTrack);
router.delete('/:id/tracks/:trackId', PlaylistController.removeTrack);

export const playlistRoutes = router;
