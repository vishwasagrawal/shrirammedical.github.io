import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import { prisma } from './config/database';
import cron from 'node-cron';
import { ExpiryAlertService } from './services/expiry-alert.service';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully');

    const server = app.listen(PORT, () => {
      logger.info(`MedStore API running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`);
    });

    // Schedule expiry check daily at 8 AM
    cron.schedule('0 8 * * *', async () => {
      logger.info('Running scheduled expiry alert check...');
      try {
        await ExpiryAlertService.checkAndCreateAlerts();
      } catch (err) {
        logger.error('Expiry alert cron failed:', err);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
