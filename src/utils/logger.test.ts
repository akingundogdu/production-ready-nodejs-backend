import winston from 'winston';
import config from '../config';

// Mock winston completely
jest.mock('winston', () => {
  const mockLogger = {
    add: jest.fn(),
  };
  
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn((...args) => args),
      timestamp: jest.fn(() => 'timestamp'),
      errors: jest.fn((options) => `errors(${JSON.stringify(options)})`),
      json: jest.fn(() => 'json'),
      colorize: jest.fn(() => 'colorize'),
      simple: jest.fn(() => 'simple'),
    },
    transports: {
      File: jest.fn(),
      Console: jest.fn(),
    },
  };
});

// Mock config - create a mutable config object
const mockConfig = {
  logging: {
    level: 'debug',
  },
  env: 'development',
};

jest.mock('../config', () => mockConfig);

describe('Logger', () => {
  let mockWinston: jest.Mocked<typeof winston>;
  let mockLogger: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Reset modules so logger is re-imported fresh each time
    jest.resetModules();
    
    // Reset mock config to default state
    mockConfig.env = 'development';
    mockConfig.logging.level = 'debug';
    
    // Get fresh mocked instances
    mockWinston = require('winston');
    mockLogger = mockWinston.createLogger();
  });

  describe('Logger Creation', () => {
    it('should create winston logger with correct configuration', () => {
      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith({
        level: mockConfig.logging.level,
        format: expect.any(Array),
        defaultMeta: { service: 'api' },
        transports: [
          expect.any(Object), // File transport instance
          expect.any(Object), // File transport instance
        ],
      });
    });

    it('should configure file transports correctly', () => {
      require('./logger');

      expect(mockWinston.transports.File).toHaveBeenCalledWith({
        filename: 'logs/error.log',
        level: 'error',
      });

      expect(mockWinston.transports.File).toHaveBeenCalledWith({
        filename: 'logs/combined.log',
      });
    });

    it('should use config logging level', () => {
      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: mockConfig.logging.level,
        })
      );
    });

    it('should include service metadata', () => {
      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: { service: 'api' },
        })
      );
    });
  });

  describe('Format Configuration', () => {
    it('should combine timestamp, errors, and json formats', () => {
      require('./logger');

      expect(mockWinston.format.combine).toHaveBeenCalledWith(
        'timestamp',
        'errors({"stack":true})',
        'json'
      );
    });

    it('should configure error format with stack traces', () => {
      require('./logger');

      expect(mockWinston.format.errors).toHaveBeenCalledWith({ stack: true });
    });

    it('should include timestamp format', () => {
      require('./logger');

      expect(mockWinston.format.timestamp).toHaveBeenCalled();
    });

    it('should include json format', () => {
      require('./logger');

      expect(mockWinston.format.json).toHaveBeenCalled();
    });
  });

  describe('Environment-based Configuration', () => {
    it('should add console transport in non-production environment', () => {
      // Ensure we're in development
      mockConfig.env = 'development';

      require('./logger');

      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(Object) // Console transport instance
      );
    });

    it('should configure console transport with colorize and simple format', () => {
      mockConfig.env = 'development';

      require('./logger');

      expect(mockWinston.transports.Console).toHaveBeenCalledWith({
        format: expect.any(Array),
      });
    });

    it('should not add console transport in production environment', () => {
      mockConfig.env = 'production';
      
      // Clear the mock first since we set it up in beforeEach
      jest.clearAllMocks();
      jest.resetModules();
      // Get fresh mocked instances after clearing
      mockWinston = require('winston');
      mockLogger = mockWinston.createLogger();

      require('./logger');

      expect(mockLogger.add).not.toHaveBeenCalled();
    });

    it('should add console transport in test environment', () => {
      mockConfig.env = 'test';

      require('./logger');

      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(Object) // Console transport instance
      );
    });

    it('should add console transport in staging environment', () => {
      mockConfig.env = 'staging';

      require('./logger');

      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(Object) // Console transport instance
      );
    });
  });

  describe('Console Format Configuration', () => {    
    it('should combine colorize and simple formats for console', () => {
      mockConfig.env = 'development';
      require('./logger');

      // Check if combine was called with colorize and simple formats for console
      const combineCalls = (mockWinston.format.combine as jest.Mock).mock.calls;
      const consoleFormatCall = combineCalls.find(call => 
        Array.isArray(call) && call.includes('colorize') && call.includes('simple')
      );
      expect(consoleFormatCall).toBeDefined();
    });

    it('should configure colorize format', () => {
      mockConfig.env = 'development';
      require('./logger');

      expect(mockWinston.format.colorize).toHaveBeenCalled();
    });

    it('should configure simple format', () => {
      mockConfig.env = 'development';
      require('./logger');

      expect(mockWinston.format.simple).toHaveBeenCalled();
    });
  });

  describe('Different Log Levels', () => {
    it('should handle different log levels from config', () => {
      mockConfig.logging.level = 'info';
      
      // Clear mocks and reset module to ensure fresh start
      jest.clearAllMocks();
      jest.resetModules();
      mockWinston = require('winston');

      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      );
    });

    it('should handle error level from config', () => {
      mockConfig.logging.level = 'error';
      
      // Clear mocks and reset module to ensure fresh start
      jest.clearAllMocks();
      jest.resetModules();
      mockWinston = require('winston');

      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
        })
      );
    });

    it('should handle warn level from config', () => {
      mockConfig.logging.level = 'warn';
      
      // Clear mocks and reset module to ensure fresh start
      jest.clearAllMocks();
      jest.resetModules();
      mockWinston = require('winston');

      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
        })
      );
    });
  });

  describe('Export', () => {
    it('should export the created logger instance', () => {
      const logger = require('./logger').default;

      expect(logger).toBe(mockLogger);
    });
  });
}); 