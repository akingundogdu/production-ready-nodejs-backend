import { DataSource } from 'typeorm';
import path from 'path';

// Mock dependencies
const mockDataSourceInstance = { isInitialized: false };
const mockDataSource = jest.fn(() => mockDataSourceInstance);

jest.mock('typeorm', () => ({
  DataSource: mockDataSource,
}));

jest.mock('./index', () => ({
  db: {
    host: 'test-host',
    port: 5432,
    username: 'test-user',
    password: 'test-password',
    database: 'test-db',
    schema: 'test-schema',
  },
  env: 'development',
}));

const mockPathJoin = jest.fn((...args) => args.join('/'));
jest.mock('path', () => ({
  join: mockPathJoin,
}));

// Import the module to trigger initialization
import { AppDataSource } from './database';

describe('Database Configuration', () => {
  // Store initial mock calls made during module initialization
  const initialDataSourceCalls = [...mockDataSource.mock.calls];
  const initialPathJoinCalls = [...mockPathJoin.mock.calls];

  beforeEach(() => {
    // Reset mocks but preserve initial calls for initialization tests
    mockDataSource.mockClear();
    mockPathJoin.mockClear();
    
    // Restore initial calls
    initialDataSourceCalls.forEach(call => {
      mockDataSource.mock.calls.push(call);
    });
    
    initialPathJoinCalls.forEach(call => {
      mockPathJoin.mock.calls.push(call);
    });
  });

  describe('AppDataSource Creation', () => {
    it('should create DataSource with correct configuration', () => {
      expect(mockDataSource).toHaveBeenCalledWith({
        type: 'postgres',
        host: 'test-host',
        port: 5432,
        username: 'test-user',
        password: 'test-password',
        database: 'test-db',
        schema: 'test-schema',
        synchronize: false,
        logging: true, // env is 'development'
        entities: [expect.any(String)],
        migrations: [expect.any(String)],
        subscribers: [expect.any(String)],
        maxQueryExecutionTime: 1000,
        connectTimeoutMS: 10000,
        extra: {
          max: 25,
        },
      });
    });

    it('should use correct database type', () => {
      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.type).toBe('postgres');
    });

    it('should disable synchronize for safety', () => {
      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.synchronize).toBe(false);
    });

    it('should enable logging in development environment', () => {
      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.logging).toBe(true);
    });

    it('should disable logging in production environment', () => {
      // Mock production environment and require fresh module
      jest.resetModules();
      jest.doMock('./index', () => ({
        db: {
          host: 'prod-host',
          port: 5432,
          username: 'prod-user',
          password: 'prod-password',
          database: 'prod-db',
          schema: 'prod-schema',
        },
        env: 'production',
      }));

      require('./database');

      // Get the most recent call (after the reset)
      const callArgs = (mockDataSource.mock.calls as any)[(mockDataSource.mock.calls as any).length - 1]?.[0];
      expect(callArgs?.logging).toBe(false);
    });

    it('should set correct connection timeouts and pool settings', () => {
      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.maxQueryExecutionTime).toBe(1000);
      expect(callArgs?.connectTimeoutMS).toBe(10000);
      expect(callArgs?.extra?.max).toBe(25);
    });
  });

  describe('Path Configuration', () => {
    it('should configure entities path correctly', () => {
      expect(mockPathJoin).toHaveBeenCalledWith(
        expect.any(String),
        '../models/**/*.entity{.ts,.js}'
      );

      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.entities).toEqual([expect.stringContaining('models')]);
    });

    it('should configure migrations path correctly', () => {
      expect(mockPathJoin).toHaveBeenCalledWith(
        expect.any(String),
        '../migrations/**/*{.ts,.js}'
      );

      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.migrations).toEqual([expect.stringContaining('migrations')]);
    });

    it('should configure subscribers path correctly', () => {
      expect(mockPathJoin).toHaveBeenCalledWith(
        expect.any(String),
        '../subscribers/**/*{.ts,.js}'
      );

      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      expect(callArgs?.subscribers).toEqual([expect.stringContaining('subscribers')]);
    });

    it('should use __dirname for path resolution', () => {
      // Verify that path.join was called with __dirname as first argument
      const pathJoinCalls = mockPathJoin.mock.calls;
      expect(pathJoinCalls.length).toBeGreaterThan(0);
      
      // Each call should have __dirname (or similar) as first argument
      pathJoinCalls.forEach(call => {
        expect(call[0]).toBeDefined();
        expect(typeof call[0]).toBe('string');
      });
    });
  });

  describe('Database Configuration Values', () => {
    it('should use all database configuration from config', () => {
      const callArgs = (mockDataSource.mock.calls as any)[0]?.[0];
      
      expect(callArgs?.host).toBe('test-host');
      expect(callArgs?.port).toBe(5432);
      expect(callArgs?.username).toBe('test-user');
      expect(callArgs?.password).toBe('test-password');
      expect(callArgs?.database).toBe('test-db');
      expect(callArgs?.schema).toBe('test-schema');
    });

    it('should handle different database configurations', () => {
      // Mock different config and require fresh module
      jest.resetModules();
      jest.doMock('./index', () => ({
        db: {
          host: 'another-host',
          port: 3306,
          username: 'another-user',
          password: 'another-password',
          database: 'another-db',
          schema: 'another-schema',
        },
        env: 'test',
      }));

      require('./database');

      // Get the most recent call (after the reset)
      const callArgs = (mockDataSource.mock.calls as any)[(mockDataSource.mock.calls as any).length - 1]?.[0];
      
      expect(callArgs?.host).toBe('another-host');
      expect(callArgs?.port).toBe(3306);
      expect(callArgs?.username).toBe('another-user');
      expect(callArgs?.password).toBe('another-password');
      expect(callArgs?.database).toBe('another-db');
      expect(callArgs?.schema).toBe('another-schema');
    });
  });

  describe('AppDataSource Export', () => {
    it('should export AppDataSource as named export', () => {
      expect(AppDataSource).toBeDefined();
    });

    it('should return the created DataSource instance', () => {
      expect(AppDataSource).toBe(mockDataSourceInstance);
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should handle test environment', () => {
      jest.resetModules();
      jest.doMock('./index', () => ({
        db: {
          host: 'test-host',
          port: 5432,
          username: 'test-user',
          password: 'test-password',
          database: 'test-db',
          schema: 'test-schema',
        },
        env: 'test',
      }));

      require('./database');

      // Get the most recent call (after the reset)
      const callArgs = (mockDataSource.mock.calls as any)[(mockDataSource.mock.calls as any).length - 1]?.[0];
      expect(callArgs?.logging).toBe(false); // test environment should not log
    });

    it('should handle staging environment', () => {
      jest.resetModules();
      jest.doMock('./index', () => ({
        db: {
          host: 'staging-host',
          port: 5432,
          username: 'staging-user',
          password: 'staging-password',
          database: 'staging-db',
          schema: 'staging-schema',
        },
        env: 'staging',
      }));

      require('./database');

      // Get the most recent call (after the reset)
      const callArgs = (mockDataSource.mock.calls as any)[(mockDataSource.mock.calls as any).length - 1]?.[0];
      expect(callArgs?.logging).toBe(false); // staging environment should not log
    });
  });
}); 