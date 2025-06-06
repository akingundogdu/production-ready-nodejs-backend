import { Express } from 'express';

// Mock all dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

const mockServer = {
  listen: jest.fn(),
  close: jest.fn(),
};

const mockApp = {
  listen: jest.fn().mockReturnValue(mockServer),
} as unknown as Express;

const mockAppDataSource = {
  isInitialized: false,
  destroy: jest.fn(),
};

const mockConfig = {
  port: 3000,
  env: 'test',
  apiPrefix: '/api/v1',
};

// Mock process.exit and process.on
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();
const mockProcessOn = jest.spyOn(process, 'on').mockImplementation();

jest.mock('./config', () => mockConfig);
jest.mock('./utils/logger', () => mockLogger);
jest.mock('./app', () => jest.fn().mockResolvedValue(mockApp));

// Mock the database import
jest.mock('./config/database', () => ({
  AppDataSource: mockAppDataSource,
}));

describe('Server Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset mock implementations
    mockServer.listen.mockReturnValue(mockServer);
    mockServer.close.mockImplementation((callback: any) => callback && callback());
    mockAppDataSource.isInitialized = false;
    mockAppDataSource.destroy.mockResolvedValue(undefined);
    mockProcessExit.mockImplementation();
    mockProcessOn.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Server Startup', () => {
    it('should start server successfully', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Server is running on port 3000 in test mode');
      expect(mockLogger.info).toHaveBeenCalledWith('API Documentation available at /api/v1/docs');
    });

    it('should handle server startup error', async () => {
      const createApp = require('./app');
      const startupError = new Error('Failed to create app');
      createApp.mockRejectedValue(startupError);

      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith('Error starting server:', startupError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should register SIGTERM and SIGINT handlers', async () => {
      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });

  describe('Graceful Shutdown', () => {
    let shutdownHandler: () => void;

    beforeEach(async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      const processOnCalls = mockProcessOn.mock.calls;
      const sigtermCall = processOnCalls.find(call => call[0] === 'SIGTERM');
      shutdownHandler = sigtermCall ? sigtermCall[1] as () => void : () => {};
    });

    it('should handle graceful shutdown with database cleanup', async () => {
      mockAppDataSource.isInitialized = true;
      
      mockServer.close.mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
      });

      shutdownHandler();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockAppDataSource.destroy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database connection closed');
      expect(mockLogger.info).toHaveBeenCalledWith('Closed out remaining connections');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should handle graceful shutdown without database connection', async () => {
      mockAppDataSource.isInitialized = false;
      
      mockServer.close.mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
      });

      shutdownHandler();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockAppDataSource.destroy).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Closed out remaining connections');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should handle database cleanup error during shutdown', async () => {
      mockAppDataSource.isInitialized = true;
      const dbError = new Error('Database cleanup failed');
      mockAppDataSource.destroy.mockRejectedValue(dbError);
      
      mockServer.close.mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
      });

      shutdownHandler();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockAppDataSource.destroy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error during shutdown:', dbError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle shutdown timeout', (done) => {
      jest.useFakeTimers();
      
      mockServer.close.mockImplementation(() => {
        // Don't call the callback - simulate hanging connections
      });

      shutdownHandler();
      jest.advanceTimersByTime(10000);

      setTimeout(() => {
        expect(mockLogger.error).toHaveBeenCalledWith('Could not close connections in time, forcefully shutting down');
        expect(mockProcessExit).toHaveBeenCalledWith(1);
        jest.useRealTimers();
        done();
      }, 0);
    });

    it('should handle SIGINT signal', async () => {
      const processOnCalls = mockProcessOn.mock.calls;
      const sigintCall = processOnCalls.find(call => call[0] === 'SIGINT');
      const sigintHandler = sigintCall ? sigintCall[1] as () => void : () => {};

      mockServer.close.mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
      });

      sigintHandler();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });
  });

  describe('Server Configuration', () => {
    it('should use correct port from config', async () => {
      mockConfig.port = 8080;
      
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      jest.resetModules();
      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApp.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    });

    it('should use correct environment from config', async () => {
      mockConfig.env = 'production';
      
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      jest.resetModules();
      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLogger.info).toHaveBeenCalledWith('Server is running on port 3000 in production mode');
    });

    it('should use correct API prefix from config', async () => {
      mockConfig.apiPrefix = '/api/v2';
      
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      jest.resetModules();
      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLogger.info).toHaveBeenCalledWith('API Documentation available at /api/v2/docs');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle app.listen error', async () => {
      const listenError = new Error('Port already in use');
      (mockApp.listen as jest.Mock).mockImplementation(() => {
        throw listenError;
      });

      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith('Error starting server:', listenError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Module Integration', () => {
    it('should import and call createApp', async () => {
      const createApp = require('./app');
      
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(createApp).toHaveBeenCalled();
    });

    it('should dynamically import database module during shutdown', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        callback();
        return mockServer;
      });

      require('./index');
      await new Promise(resolve => setTimeout(resolve, 0));

      const processOnCalls = mockProcessOn.mock.calls;
      const sigtermCall = processOnCalls.find(call => call[0] === 'SIGTERM');
      const shutdownHandler = sigtermCall ? sigtermCall[1] as () => void : () => {};

      mockAppDataSource.isInitialized = true;
      mockServer.close.mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
      });

      shutdownHandler();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockAppDataSource.destroy).toHaveBeenCalled();
    });
  });
}); 