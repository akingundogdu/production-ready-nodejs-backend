import { Request, Response, NextFunction } from 'express';
import { getCache, setCache } from '../utils/redis';
import logger from '../utils/logger';

export interface CacheOptions {
  ttl?: number;
  key?: string | ((req: Request) => string);
}

export const cache = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate cache key
      const cacheKey = typeof options.key === 'function'
        ? options.key(req)
        : options.key || `${req.method}:${req.originalUrl}`;

      // Try to get data from cache
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Store original send function
      const originalSend = res.json;

      // Override send function
      res.json = function (body: any): Response {
        // Restore original send
        res.json = originalSend;

        // Cache the response
        setCache(cacheKey, body, options.ttl)
          .catch(err => logger.error('Cache Set Error:', err));

        // Send the response
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Cache Middleware Error:', error);
      next();
    }
  };
}; 