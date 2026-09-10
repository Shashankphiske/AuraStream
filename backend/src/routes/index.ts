import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/user.routes.js';
import { musicRoutes } from '../modules/music/track.routes.js';
import { youtubeRoutes } from '../modules/youtube/youtube.routes.js';
import { playlistRoutes } from '../modules/playlists/playlist.routes.js';
import { favoriteRoutes } from '../modules/favorites/favorite.routes.js';
import { historyRoutes } from '../modules/history/history.routes.js';
import { recommendationRoutes } from '../modules/recommendations/recommendation.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';
import { sendSuccess } from '../utils/apiResponse.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    service: 'AuraStream API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  }, 'Service is operational');
});

// Feature routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/music', musicRoutes);
apiRouter.use('/youtube', youtubeRoutes);
apiRouter.use('/playlists', playlistRoutes);
apiRouter.use('/favorites', favoriteRoutes);
apiRouter.use('/history', historyRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/admin', adminRoutes);

export const v1Routes = apiRouter;
