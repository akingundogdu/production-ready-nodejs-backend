import winston from 'winston';
import config from '../config';

// Mock winston
const mockCreateLogger = jest.fn();
const mockAdd = jest.fn();
const mockLogger = {
  add: mockAdd,
};

jest.mock('winston', () => ({
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
}));

// Mock config
jest.mock('../config', () => ({
  logging: {
    level: 'debug',
  },
  env: 'development',
}));

const mockWinston = winston as jest.Mocked<typeof winston>;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Logger Creation', () => {
    it('should create winston logger with correct configuration', () => {
      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith({
        level: config.logging.level,
        format: ['timestamp', 'errors({"stack":true})', 'json'],
        defaultMeta: { service: 'api' },
        transports: [
          expect.any(mockWinston.transports.File),
          expect.any(mockWinston.transports.File),
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
          level: config.logging.level,
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
      (config as any).env = 'development';

      require('./logger');

      expect(mockAdd).toHaveBeenCalledWith(
        expect.any(mockWinston.transports.Console)
      );
    });

    it('should configure console transport with colorize and simple format', () => {
      (config as any).env = 'development';

      require('./logger');

      expect(mockWinston.transports.Console).toHaveBeenCalledWith({
        format: ['colorize', 'simple'],
      });
    });

    it('should not add console transport in production environment', () => {
      (config as any).env = 'production';

      require('./logger');

      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('should add console transport in test environment', () => {
      (config as any).env = 'test';

      require('./logger');

      expect(mockAdd).toHaveBeenCalledWith(
        expect.any(mockWinston.transports.Console)
      );
    });

    it('should add console transport in staging environment', () => {
      (config as any).env = 'staging';

      require('./logger');

      expect(mockAdd).toHaveBeenCalledWith(
        expect.any(mockWinston.transports.Console)
      );
    });
  });

  describe('Console Format Configuration', () => {
    beforeEach(() => {
      (config as any).env = 'development';
    });

    it('should combine colorize and simple formats for console', () => {
      require('./logger');

      expect(mockWinston.format.combine).toHaveBeenCalledWith(
        'colorize',
        'simple'
      );
    });

    it('should configure colorize format', () => {
      require('./logger');

      expect(mockWinston.format.colorize).toHaveBeenCalled();
    });

    it('should configure simple format', () => {
      require('./logger');

      expect(mockWinston.format.simple).toHaveBeenCalled();
    });
  });

  describe('Export', () => {
    it('should export the created logger instance', () => {
      const logger = require('./logger').default;

      expect(logger).toBe(mockLogger);
    });
  });

  describe('Different Log Levels', () => {
    it('should handle different log levels from config', () => {
      (config as any).logging.level = 'info';

      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        })
      );
    });

    it('should handle error level from config', () => {
      (config as any).logging.level = 'error';

      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
        })
      );
    });

    it('should handle warn level from config', () => {
      (config as any).logging.level = 'warn';

      require('./logger');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
        })
      );
    });
  });
}); 