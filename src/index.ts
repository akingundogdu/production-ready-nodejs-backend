import config from './config';
import logger from './utils/logger';
import createApp from './app';

const startServer = async () => {
  try {
    const app = await createApp();

    const server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.env} mode`);
      logger.info(`API Documentation available at ${config.apiPrefix}/docs`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Received kill signal, shutting down gracefully');
      
      server.close(async () => {
        try {
          // Close database connection
          const { AppDataSource } = await import('./config/database');
          if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            logger.info('Database connection closed');
          }
          
          logger.info('Closed out remaining connections');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 