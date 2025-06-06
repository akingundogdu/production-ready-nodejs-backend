import { createClient } from 'redis';
import config from '../config';
import logger from './logger';

const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Redis Connection Error:', error);
    throw error;
  }
};

export const disconnectRedis = async () => {
  try {
    await redisClient.disconnect();
    logger.info('Redis Client Disconnected');
  } catch (error) {
    logger.error('Redis Disconnection Error:', error);
    throw error;
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis Get Error:', error);
    return null;
  }
};

export const setCache = async <T>(
  key: string,
  value: T,
  ttl: number = config.redis.ttl,
): Promise<void> => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis Set Error:', error);
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis Delete Error:', error);
  }
};

export const clearCache = async (): Promise<void> => {
  try {
    await redisClient.flushAll();
  } catch (error) {
    logger.error('Redis Clear Error:', error);
  }
};

export default redisClient; 