import { DataSourceOptions } from 'typeorm';

// Mock the AppDataSource
const mockAppDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'test-host',
  port: 5432,
  username: 'test-user',
  password: 'test-password',
  database: 'test-db',
  schema: 'test-schema',
  synchronize: false,
  logging: true,
  entities: ['test-entities'],
  migrations: ['test-migrations'],
  subscribers: ['test-subscribers'],
};

jest.mock('./database', () => ({
  AppDataSource: {
    options: mockAppDataSourceOptions,
  },
}));

describe('TypeORM Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Configuration Export', () => {
    it('should export config as default export', () => {
      const typeormConfig = require('./typeorm.config');

      expect(typeormConfig).toHaveProperty('default');
      expect(typeormConfig.default).toBeDefined();
    });

    it('should export config object with DataSourceOptions type', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Verify it has the structure of DataSourceOptions
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });
  });

  describe('Configuration Values', () => {
    it('should spread AppDataSource options into config', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Verify that all AppDataSource options are present
      expect(config.type).toBe('postgres');
      expect(config.host).toBe('test-host');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('test-user');
      expect(config.password).toBe('test-password');
      expect(config.database).toBe('test-db');
      expect(config.schema).toBe('test-schema');
      expect(config.synchronize).toBe(false);
      expect(config.logging).toBe(true);
    });

    it('should include all database connection properties', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Check all required connection properties
      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('username');
      expect(config).toHaveProperty('password');
      expect(config).toHaveProperty('database');
    });

    it('should include TypeORM-specific properties', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Check TypeORM-specific properties
      expect(config).toHaveProperty('entities');
      expect(config).toHaveProperty('migrations');
      expect(config).toHaveProperty('subscribers');
      expect(config).toHaveProperty('synchronize');
      expect(config).toHaveProperty('logging');
    });

    it('should preserve entities configuration', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      expect(config.entities).toEqual(['test-entities']);
    });

    it('should preserve migrations configuration', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      expect(config.migrations).toEqual(['test-migrations']);
    });

    it('should preserve subscribers configuration', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      expect(config.subscribers).toEqual(['test-subscribers']);
    });
  });

  describe('Object Spread Behavior', () => {
    it('should create a shallow copy of AppDataSource options', () => {
      const { AppDataSource } = require('./database');
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Should be a copy, not the same reference
      expect(config).not.toBe(AppDataSource.options);
      
      // But should have same values
      expect(config).toEqual(AppDataSource.options);
    });

    it('should handle empty or undefined options', () => {
      // Mock AppDataSource with minimal options
      jest.doMock('./database', () => ({
        AppDataSource: {
          options: {},
        },
      }));

      jest.resetModules();
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      expect(config).toEqual({});
    });

    it('should handle all AppDataSource option properties', () => {
      // Mock with additional properties
      const extendedOptions = {
        ...mockAppDataSourceOptions,
        maxQueryExecutionTime: 1000,
        connectTimeoutMS: 10000,
        extra: { max: 25 },
      };

      jest.doMock('./database', () => ({
        AppDataSource: {
          options: extendedOptions,
        },
      }));

      jest.resetModules();
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      expect(config.maxQueryExecutionTime).toBe(1000);
      expect(config.connectTimeoutMS).toBe(10000);
      expect(config.extra).toEqual({ max: 25 });
    });
  });

  describe('CLI Usage Compatibility', () => {
    it('should be compatible with TypeORM CLI requirements', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // TypeORM CLI typically requires certain properties
      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('database');

      // Should have file paths for entities and migrations
      expect(config.entities).toBeDefined();
      expect(config.migrations).toBeDefined();
    });

    it('should export DataSourceOptions compatible object', () => {
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Basic structure check for DataSourceOptions
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
      expect(config).not.toBeUndefined();
    });

    it('should maintain configuration consistency with AppDataSource', () => {
      const { AppDataSource } = require('./database');
      const typeormConfig = require('./typeorm.config');
      const config = typeormConfig.default;

      // Verify that CLI config matches runtime config
      expect(config.type).toBe(AppDataSource.options.type);
      expect(config.database).toBe(AppDataSource.options.database);
      expect(config.host).toBe(AppDataSource.options.host);
      expect(config.port).toBe(AppDataSource.options.port);
    });
  });

  describe('Import Dependencies', () => {
    it('should import DataSourceOptions type from typeorm', () => {
      // This test ensures the import is working
      // The fact that we can require the module without errors indicates success
      expect(() => {
        require('./typeorm.config');
      }).not.toThrow();
    });

    it('should import AppDataSource from database module', () => {
      const typeormConfig = require('./typeorm.config');
      
      // The config should have values from AppDataSource
      expect(typeormConfig.default).toBeDefined();
      expect(Object.keys(typeormConfig.default).length).toBeGreaterThan(0);
    });
  });
}); 