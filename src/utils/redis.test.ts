import { createClient } from 'redis';
import config from '../config';
import logger from './logger';

// Mock dependencies with proper setup
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
  on: jest.fn(),
};

const mockCreateClient = jest.fn(() => mockRedisClient);

jest.mock('redis', () => ({
  createClient: mockCreateClient,
}));

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

const mockLogger = logger as jest.Mocked<typeof logger>;

// Import the module to trigger initialization
import {
  connectRedis,
  disconnectRedis,
  getCache,
  setCache,
  deleteCache,
  clearCache,
} from './redis';

describe('Redis Utilities', () => {
  // Store initial mock calls made during module initialization
  const initialMockCreateClientCalls = [...mockCreateClient.mock.calls];
  const initialMockOnCalls = [...mockRedisClient.on.mock.calls];

  beforeEach(() => {
    // Reset mocks but preserve initial calls for initialization tests
    const functionsToReset = [
      mockRedisClient.connect,
      mockRedisClient.disconnect,
      mockRedisClient.get,
      mockRedisClient.setEx,
      mockRedisClient.del,
      mockRedisClient.flushAll,
      mockLogger.info,
      mockLogger.error,
    ];

    functionsToReset.forEach(fn => fn.mockClear());
    
    // Only clear newer calls, preserve the initial setup calls
    const currentCreateClientCalls = mockCreateClient.mock.calls.length;
    const currentOnCalls = mockRedisClient.on.mock.calls.length;
    
    // If there are new calls beyond the initial ones, clear only those
    if (currentCreateClientCalls > initialMockCreateClientCalls.length) {
      mockCreateClient.mockClear();
      // Restore initial calls
      initialMockCreateClientCalls.forEach(call => {
        mockCreateClient.mock.calls.push(call);
      });
    }
    
    if (currentOnCalls > initialMockOnCalls.length) {
      mockRedisClient.on.mockClear();
      // Restore initial calls
      initialMockOnCalls.forEach(call => {
        mockRedisClient.on.mock.calls.push(call);
      });
    }
  });

  describe('Redis Client Creation and Event Handlers', () => {
    it('should create redis client with correct configuration', () => {
      expect(mockCreateClient).toHaveBeenCalledWith({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });
    });

    it('should register error and connect event handlers', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle redis error events and call logger.error (LINE 14)', () => {
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

      const result = await getCache(testKey);

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
      const testData = { id: 1, name: 'test' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testData)
      );
    });

    it('should set cache with custom TTL', async () => {
      const testKey = 'test-key';
      const testData = { id: 1, name: 'test' };
      const customTtl = 1800;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testData, customTtl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        customTtl,
        JSON.stringify(testData)
      );
    });

    it('should handle set cache errors', async () => {
      const testKey = 'error-key';
      const testData = { id: 1, name: 'test' };
      const setError = new Error('Redis set failed');
      mockRedisClient.setEx.mockRejectedValue(setError);

      await setCache(testKey, testData);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Set Error:', setError);
    });
  });

  describe('deleteCache', () => {
    it('should delete cache key successfully', async () => {
      const testKey = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      await deleteCache(testKey);

      expect(mockRedisClient.del).toHaveBeenCalledWith(testKey);
    });

    it('should handle delete cache errors', async () => {
      const testKey = 'error-key';
      const deleteError = new Error('Redis delete failed');
      mockRedisClient.del.mockRejectedValue(deleteError);

      await deleteCache(testKey);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Delete Error:', deleteError);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache successfully', async () => {
      mockRedisClient.flushAll.mockResolvedValue('OK');

      await clearCache();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });

    it('should handle clear cache errors', async () => {
      const clearError = new Error('Redis clear failed');
      mockRedisClient.flushAll.mockRejectedValue(clearError);

      await clearCache();

      expect(mockLogger.error).toHaveBeenCalledWith('Redis Clear Error:', clearError);
    });
  });

  describe('Type Safety and Edge Cases', () => {
    it('should handle null values correctly in setCache', async () => {
      const testKey = 'null-key';
      const testData = null;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testData)
      );
    });

    it('should handle undefined values correctly in setCache', async () => {
      const testKey = 'undefined-key';
      const testData = undefined;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await setCache(testKey, testData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testData)
      );
    });

    it('should handle complex objects in cache operations', async () => {
      interface TestData {
        id: number;
        name: string;
        nested: {
          value: boolean;
          items: string[];
        };
      }

      const testKey = 'complex-key';
      const testData: TestData = {
        id: 1,
        name: 'test',
        nested: {
          value: true,
          items: ['a', 'b', 'c'],
        },
      };

      // Test setting complex data
      mockRedisClient.setEx.mockResolvedValue('OK');
      await setCache(testKey, testData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        testKey,
        config.redis.ttl,
        JSON.stringify(testData)
      );

      // Reset mocks for get test
      jest.clearAllMocks();

      // Test getting complex data
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));
      const result = await getCache(testKey);

      expect(mockRedisClient.get).toHaveBeenCalledWith(testKey);
      expect(result).toEqual(testData);
    });
  });
});