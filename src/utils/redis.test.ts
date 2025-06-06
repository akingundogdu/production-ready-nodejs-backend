import { createClient } from 'redis';
import config from '../config';
import logger from './logger';
import {
  connectRedis,
  disconnectRedis,
  getCache,
  setCache,
  deleteCache,
  clearCache,
} from './redis';

// Mock dependencies
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    flushAll: jest.fn(),
    on: jest.fn(),
  };

  return {
    createClient: jest.fn(() => mockRedisClient),
  };
});

jest.mock('../config', () => ({
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'redis-password',
    ttl: 3600,
  },
}));

jest.mock('./logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Get the mock redis client from the create client return value
const getMockRedisClient = () => {
  return mockCreateClient();
};

describe('Redis Utilities', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module to ensure fresh initialization
    jest.resetModules();
    mockRedisClient = getMockRedisClient();
  });

  describe('Redis Client Creation and Event Handlers', () => {
    it('should create redis client with correct configuration', () => {
      // Require the module to trigger initialization
      require('./redis');

      expect(mockCreateClient).toHaveBeenCalledWith({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });
    });

    it('should register error and connect event handlers', () => {
      require('./redis');

      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle redis error events and call logger.error (LINE 14)', () => {
      require('./redis');

      // Get the error handler from the mock calls
      const errorHandler = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      const testError = new Error('Redis connection failed');
      errorHandler(testError);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Client Error:', testError);
    });

    it('should handle redis connect events and call logger.info (LINE 18)', () => {
      require('./redis');

      // Get the connect handler from the mock calls
      const connectHandler = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1];

      expect(connectHandler).toBeDefined();

      connectHandler();

      expect(mockLogger.info).toHaveBeenCalledWith('Redis Client Connected');
    });
  });

  describe('connectRedis', () => {
    it('should connect to redis successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await connectRedis();

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValue(connectionError);

      await expect(connectRedis()).rejects.toThrow(connectionError);
      expect(mockLogger.error).toHaveBeenCalledWith('Redis Connection Error:', connectionError);
    });
  });

  describe('disconnectRedis', () => {
    it('should disconnect from redis successfully', async () => {
      mockRedisClient.disconnect.mockResolvedValue(undefined);

      await disconnectRedis();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Redis Client Disconnected');
    });

    it('should handle disconnection errors', async () => {
      const disconnectionError = new Error('Disconnection failed');
      mockRedisClient.disconnect.mockRejectedValue(disconnectionError);

      await expect(disconnectRedis()).rejects.toThrow(disconnectionError);
      expect(mockLogger.error).toHaveBeenCalledWith('Redis Disconnection Error:', disconnectionError);
    });
  });

  describe('getCache', () => {
    it('should get and parse cached data successfully', async () => {
      const testKey = 'test-key';
      const testData = { id: 1, name: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await getCache<typeof testData>(testKey);

      expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
      expect(result).toEqual(testData);
    });

    it('should return null when cache key does not exist', async () => {
      const testKey = 'non-existent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getCache(testKey);

      expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
      expect(result).toBeNull();
    });

    it('should return null when cache value is empty', async () => {
      const testKey = 'empty-key';
      mockRedisClient.get.mockResolvedValue('');

      const result = await getCache(testKey);

      expect(result).toBeNull();
    });

    it('should handle parsing errors and return null', async () => {
      const testKey = 'invalid-json-key';
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await getCache(testKey);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Get Error:', expect.any(Error));
      expect(result).toBeNull();
    });

    it('should handle redis get errors', async () => {
      const testKey = 'error-key';
      const redisError = new Error('Redis get failed');
      mockRedisClient.get.mockRejectedValue(redisError);

      const result = await getCache(testKey);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Get Error:', redisError);
      expect(result).toBeNull();
    });
  });

  describe('setCache', () => {
    it('should set cache with default TTL', async () => {
      const testKey = 'test-key';
      const testValue = { id: 1, name: 'test' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testValue);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testValue)
      );
    });

    it('should set cache with custom TTL', async () => {
      const testKey = 'test-key';
      const testValue = { id: 1, name: 'test' };
      const customTtl = 1800;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testValue, customTtl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        customTtl,
        JSON.stringify(testValue)
      );
    });

    it('should handle string values', async () => {
      const testKey = 'string-key';
      const testValue = 'test string';
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testValue);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testValue)
      );
    });

    it('should handle number values', async () => {
      const testKey = 'number-key';
      const testValue = 123;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testValue);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testValue)
      );
    });

    it('should handle redis set errors', async () => {
      const testKey = 'error-key';
      const testValue = 'test';
      const redisError = new Error('Redis set failed');
      mockRedisClient.setEx.mockRejectedValue(redisError);

      await setCache(testKey, testValue);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Set Error:', redisError);
    });
  });

  describe('deleteCache', () => {
    it('should delete cache key successfully', async () => {
      const testKey = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      await deleteCache(testKey);

      expect(mockRedisClient.del).toHaveBeenCalledWith(testKey);
    });

    it('should handle redis delete errors', async () => {
      const testKey = 'error-key';
      const redisError = new Error('Redis delete failed');
      mockRedisClient.del.mockRejectedValue(redisError);

      await deleteCache(testKey);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Delete Error:', redisError);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache successfully', async () => {
      mockRedisClient.flushAll.mockResolvedValue('OK');

      await clearCache();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });

    it('should handle redis flush errors', async () => {
      const redisError = new Error('Redis flush failed');
      mockRedisClient.flushAll.mockRejectedValue(redisError);

      await clearCache();

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Clear Error:', redisError);
    });
  });

  describe('Default Export', () => {
    it('should export redis client as default', () => {
      const redisModule = require('./redis');

      expect(redisModule.default).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should handle typed cache operations', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const testKey = 'typed-key';
      const testData: TestData = { id: 1, name: 'test' };
      
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      await setCache<TestData>(testKey, testData);
      const result = await getCache<TestData>(testKey);

      expect(result).toEqual(testData);
    });
  });
}); 