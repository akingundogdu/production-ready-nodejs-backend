import request from 'supertest';
import { Express } from 'express';
import createApp from './app';
import { AppDataSource } from './config/database';
import { connectRedis } from './utils/redis';
import config from './config';

// Mock the database connection
jest.mock('./config/database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockReturnValue({
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    }),
  },
}));

// Mock the Redis connection
jest.mock('./utils/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger
jest.mock('./utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock config
jest.mock('./config', () => ({
  cors: { origin: '*' },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  apiPrefix: '/api/v1',
  swagger: { enabled: false },
  logging: { format: 'dev' },
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`Process.exit called with code ${code}`);
});

describe('App', () => {
  let app: Express;

  beforeAll(async () => {
    // Set environment to test to avoid log output
    process.env.NODE_ENV = 'test';
    app = await createApp();
  });

  afterAll(async () => {
    // Clean up database connection after tests
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
    });

    it('should return health check with timestamp', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return disconnected status when database is not initialized', async () => {
      // Mock AppDataSource as not initialized
      (AppDataSource as any).isInitialized = false;
      
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.database).toBe('disconnected');
      
      // Restore for other tests
      (AppDataSource as any).isInitialized = true;
    });
  });

  describe('GET /metrics', () => {
    it('should return metrics endpoint', async () => {
      const response = await request(app).get('/metrics');
      // The metrics endpoint should be accessible
      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/v1', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Not found' });
    });
  });

  describe('GET /not-found', () => {
    it('should return 404 Not Found', async () => {
      const response = await request(app).get('/not-found');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Not found' });
    });
  });

  describe('Initialization Error Handling', () => {
    it('should handle database initialization error', async () => {
      // Reset modules to get fresh imports
      jest.resetModules();
      
      // Mock AppDataSource.initialize to throw error
      jest.doMock('./config/database', () => ({
        AppDataSource: {
          initialize: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          isInitialized: false,
          destroy: jest.fn(),
          getRepository: jest.fn(),
        },
      }));

      // Import createApp again with the mocked error
      const { default: createAppWithError } = await import('./app');

      // Expect process.exit to be called
      await expect(createAppWithError()).rejects.toThrow('Process.exit called with code 1');
    });

    it('should handle redis initialization error', async () => {
      // Reset modules to get fresh imports
      jest.resetModules();
      
      // Mock successful database but failed Redis
      jest.doMock('./config/database', () => ({
        AppDataSource: {
          initialize: jest.fn().mockResolvedValue(undefined),
          isInitialized: true,
          destroy: jest.fn(),
          getRepository: jest.fn(),
        },
      }));

      jest.doMock('./utils/redis', () => ({
        connectRedis: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      }));

      // Import createApp again with the mocked error
      const { default: createAppWithError } = await import('./app');

      // Expect process.exit to be called
      await expect(createAppWithError()).rejects.toThrow('Process.exit called with code 1');
    });
  });

  describe('Swagger Documentation', () => {
    it('should enable swagger routes when swagger is enabled', async () => {
      // Reset modules to get fresh imports
      jest.resetModules();
      
      // Mock config with swagger enabled
      jest.doMock('./config', () => ({
        cors: { origin: '*' },
        rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
        apiPrefix: '/api/v1',
        swagger: { enabled: true },
        logging: { format: 'dev' },
      }));

      // Mock other dependencies
      jest.doMock('./config/database', () => ({
        AppDataSource: {
          initialize: jest.fn().mockResolvedValue(undefined),
          isInitialized: true,
          destroy: jest.fn(),
          getRepository: jest.fn(),
        },
      }));

      jest.doMock('./utils/redis', () => ({
        connectRedis: jest.fn().mockResolvedValue(undefined),
      }));

      // Import createApp with swagger enabled
      const { default: createAppWithSwagger } = await import('./app');
      const swaggerApp = await createAppWithSwagger();

      // Test that swagger docs endpoint exists
      const response = await request(swaggerApp).get('/api/v1/docs');
      // Should not return 404 (swagger route should be mounted)
      expect(response.status).not.toBe(404);
    });
  });
}); 