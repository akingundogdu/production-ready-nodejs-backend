import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import config from './config';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { metricsMiddleware, getMetrics } from './middleware/metrics.middleware';
import logger from './utils/logger';
import { AppDataSource } from './config/database';
import { connectRedis } from './utils/redis';
import authRoutes from './api/routes/auth.routes';
import swaggerRoutes from './middleware/swagger.middleware';

export const createApp = async () => {
  // Initialize TypeORM
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established');

    // Initialize Redis
    await connectRedis();
  } catch (error) {
    logger.error('Error during initialization:', error);
    process.exit(1);
  }

  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors(config.cors));
  app.use(helmet());
  app.use(compression());
  app.use(requestLogger);
  app.use(metricsMiddleware);

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    const dbStatus = AppDataSource.isInitialized ? 'connected' : 'disconnected';
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date(),
      database: dbStatus,
    });
  });

  // Metrics endpoint
  app.get('/metrics', getMetrics);

  // API Documentation
  if (config.swagger.enabled) {
    app.use(`${config.apiPrefix}/docs`, swaggerRoutes);
  }

  // API routes
  app.use(`${config.apiPrefix}/auth`, authRoutes);

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  return app;
};

export default createApp; 