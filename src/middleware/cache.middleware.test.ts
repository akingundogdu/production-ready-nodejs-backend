import { Request, Response, NextFunction } from 'express';
import { cache, CacheOptions } from './cache.middleware';
import { getCache, setCache } from '../utils/redis';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

const mockGetCache = getCache as jest.MockedFunction<typeof getCache>;
const mockSetCache = setCache as jest.MockedFunction<typeof setCache>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Cache Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/test',
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('Cache Hit Scenarios', () => {
    it('should return cached data when cache hit occurs', async () => {
      const cachedData = { id: 1, name: 'test' };
      mockGetCache.mockResolvedValue(cachedData);

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('GET:/test');
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit for key: GET:/test');
      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use custom cache key when provided as string', async () => {
      const cachedData = { id: 1, name: 'test' };
      const customKey = 'custom-key';
      mockGetCache.mockResolvedValue(cachedData);

      const middleware = cache({ key: customKey });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith(customKey);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Cache hit for key: ${customKey}`);
      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
    });

    it('should use custom cache key when provided as function', async () => {
      const cachedData = { id: 1, name: 'test' };
      const keyFunction = (req: Request) => `user:${req.originalUrl}`;
      mockGetCache.mockResolvedValue(cachedData);

      const middleware = cache({ key: keyFunction });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('user:/test');
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit for key: user:/test');
      expect(mockRes.json).toHaveBeenCalledWith(cachedData);
    });
  });

  describe('Cache Miss Scenarios', () => {
    it('should proceed to next middleware when cache miss occurs', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('GET:/test');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should override res.json to cache response on cache miss', async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue();

      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toBe(originalJson); // Should be overridden
    });

    it('should cache response when overridden json method is called', async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue();

      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = { id: 1, name: 'test' };
      
      // Call the overridden json method
      (mockRes.json as any)(responseData);

      expect(mockSetCache).toHaveBeenCalledWith('GET:/test', responseData, undefined);
      expect(originalJson).toHaveBeenCalledWith(responseData);
    });

    it('should use custom TTL when caching response', async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue();

      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const customTtl = 3600;
      const middleware = cache({ ttl: customTtl });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = { id: 1, name: 'test' };
      
      // Call the overridden json method
      (mockRes.json as any)(responseData);

      expect(mockSetCache).toHaveBeenCalledWith('GET:/test', responseData, customTtl);
    });

    it('should restore original json function after caching', async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue();

      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = { id: 1, name: 'test' };
      
      // Call the overridden json method
      (mockRes.json as any)(responseData);

      // After calling, json should be restored to original
      expect(mockRes.json).toBe(originalJson);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache get errors gracefully', async () => {
      const cacheError = new Error('Cache get failed');
      mockGetCache.mockRejectedValue(cacheError);

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith('Cache Middleware Error:', cacheError);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      mockGetCache.mockResolvedValue(null);
      const cacheError = new Error('Cache set failed');
      mockSetCache.mockRejectedValue(cacheError);

      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = { id: 1, name: 'test' };
      
      // Call the overridden json method
      await (mockRes.json as any)(responseData);

      // Wait for async cache operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith('Cache Set Error:', cacheError);
      expect(originalJson).toHaveBeenCalledWith(responseData);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate default cache key from method and URL', async () => {
      mockReq.method = 'POST';
      mockReq.originalUrl = '/api/users';
      mockGetCache.mockResolvedValue(null);

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('POST:/api/users');
    });

    it('should handle different request methods', async () => {
      mockReq.method = 'PUT';
      mockReq.originalUrl = '/api/users/1';
      mockGetCache.mockResolvedValue(null);

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('PUT:/api/users/1');
    });

    it('should handle function-based key generation with request data', async () => {
      mockReq.originalUrl = '/users/123';
      mockGetCache.mockResolvedValue(null);

      const keyFunction = (req: Request) => `user-data:${req.originalUrl.split('/')[2]}`;
      const middleware = cache({ key: keyFunction });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('user-data:123');
    });
  });

  describe('Options Handling', () => {
    it('should work with empty options', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cache({});
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('GET:/test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work with no options', async () => {
      mockGetCache.mockResolvedValue(null);

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGetCache).toHaveBeenCalledWith('GET:/test');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Response Handling', () => {
    it('should handle different response data types', async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue();

      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Test with array
      const arrayData = [1, 2, 3];
      (mockRes.json as any)(arrayData);
      expect(mockSetCache).toHaveBeenCalledWith('GET:/test', arrayData, undefined);

      // Reset for next call
      mockSetCache.mockClear();
      
      // Test with string
      const stringData = 'test string';
      (mockRes.json as any)(stringData);
      expect(mockSetCache).toHaveBeenCalledWith('GET:/test', stringData, undefined);
    });

    it('should preserve response context when calling original json', async () => {
      mockGetCache.mockResolvedValue(null);
      mockSetCache.mockResolvedValue();

      const context = { test: 'context' };
      const originalJson = jest.fn().mockReturnThis();
      mockRes.json = originalJson;

      const middleware = cache();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const responseData = { id: 1 };
      
      // Call with specific context
      (mockRes.json as any).call(context, responseData);

      expect(originalJson).toHaveBeenCalledWith(responseData);
      expect(originalJson.mock.instances[0]).toBe(context);
    });
  });
}); 