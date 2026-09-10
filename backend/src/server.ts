import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { getDatabase } from './database/connection.js';
import { seedDatabase } from './database/seed.js';

const PORT = env.PORT || 5000;
const HOST = env.HOST || '127.0.0.1';

async function startServer() {
  try {
    // Ensure database is initialized
    getDatabase();

    // Auto-seed if running in development mode and database is fresh
    if (env.NODE_ENV === 'development') {
      try {
        await seedDatabase();
      } catch (seedErr) {
        logger.warn('Seed database note:', seedErr);
      }
    }

    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 AuraStream Backend Server running on http://${HOST}:${PORT}`);
      logger.info(`🎵 API Health Check: http://${HOST}:${PORT}/api/v1/health`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      logger.info('Shutting down server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });

      // Force shutdown after 10s if connections linger
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
