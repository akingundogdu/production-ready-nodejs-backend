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

// Create a mock createApp function that returns the mock app
const mockCreateApp = jest.fn().mockResolvedValue(mockApp);

// Mock process.exit and process.on with better async handling
let processExitCode: string | number | null | undefined;
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
  processExitCode = code;
  throw new Error(`process.exit(${code})`);
});
const mockProcessOn = jest.spyOn(process, 'on').mockImplementation();

// Mock setTimeout to prevent timeout issues
const originalSetTimeout = global.setTimeout;
let timeoutHandlers: Array<() => void> = [];
const mockSetTimeout = jest.fn((callback: () => void, delay: number) => {
  if (delay >= 1000) {
    // Store ALL long timeout handlers but NEVER execute them (disable ALL timeouts >= 1s)
    timeoutHandlers.push(callback);
    return { unref: jest.fn(), [Symbol.toPrimitive]: () => 'timeout' } as any;
  }
  // Execute short timeouts normally (< 1s)
  return originalSetTimeout(callback, delay);
});

jest.mock('./config', () => mockConfig);
jest.mock('./utils/logger', () => mockLogger);
jest.mock('./app', () => mockCreateApp);

// Mock the database import
jest.mock('./config/database', () => ({
  AppDataSource: mockAppDataSource,
}));

// Mock global setTimeout and clearTimeout
global.setTimeout = mockSetTimeout as any;
global.clearTimeout = jest.fn();

describe('Server Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    processExitCode = undefined;
    timeoutHandlers = []; // Clear timeout handlers
    
    // Apply setTimeout mock globally BEFORE any module imports
    global.setTimeout = mockSetTimeout as any;
    
    // Reset mock implementations
    mockApp.listen = jest.fn().mockReturnValue(mockServer);
    mockServer.close.mockImplementation((callback: any) => {
      if (callback) originalSetTimeout(() => callback(), 0); // Use original setTimeout for test callbacks
    });
    mockAppDataSource.isInitialized = false;
    mockAppDataSource.destroy.mockResolvedValue(undefined);
    mockProcessExit.mockImplementation((code?: any) => {
      processExitCode = code;
      throw new Error(`process.exit(${code})`);
    });
    mockProcessOn.mockImplementation();
    mockCreateApp.mockResolvedValue(mockApp);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    // Restore original setTimeout
    global.setTimeout = originalSetTimeout;
  });

  describe('Server Startup', () => {
    it('should start server successfully', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      expect(mockCreateApp).toHaveBeenCalled();
      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('Server is running on port 3000 in test mode');
      expect(mockLogger.info).toHaveBeenCalledWith('API Documentation available at /api/v1/docs');
    });

    it('should handle server startup error', async () => {
      const startupError = new Error('Failed to create app');
      mockCreateApp.mockRejectedValue(startupError);

      let firstExitCode: any = null;
      let exitCalled = false;
      mockProcessExit.mockImplementation((code?: any): never => {
        if (!exitCalled) {
          firstExitCode = code;
          exitCalled = true;
        }
        processExitCode = code;
        // Don't throw - just record the exit code
        return undefined as never;
      });

      require('./index');
      
      // Wait for async error handling to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith('Error starting server:', startupError);
      expect(firstExitCode).toBe(1);
    });

    it('should register SIGTERM and SIGINT handlers', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });

  describe('Graceful Shutdown', () => {
    let shutdownHandler: () => void;

    beforeEach(async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      const processOnCalls = mockProcessOn.mock.calls;
      const sigtermCall = processOnCalls.find(call => call[0] === 'SIGTERM');
      shutdownHandler = sigtermCall ? sigtermCall[1] as () => void : () => {};
    });

    it('should handle graceful shutdown with database cleanup', async () => {
      mockAppDataSource.isInitialized = true;
      mockAppDataSource.destroy.mockResolvedValue(undefined);
      
      let serverCloseCallback: any = null;
      mockServer.close.mockImplementation((callback: any) => {
        serverCloseCallback = callback;
      });

      let firstExitCode: any = null;
      mockProcessExit.mockImplementation((code?: any) => {
        if (firstExitCode === null) {
          firstExitCode = code; // Capture the first exit code (should be 0)
        }
        processExitCode = code;

        throw new Error(`process.exit(${code})`);
      });

      // Start shutdown
      shutdownHandler();
      
      // Verify initial shutdown steps
      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockServer.close).toHaveBeenCalled();
      expect(serverCloseCallback).toBeDefined();

      // Manually trigger the server close callback (simulating successful close)
      try {
        if (serverCloseCallback) {
          await serverCloseCallback();
        }
      } catch (e) {
        // Expected to throw when process.exit is called
      }

      expect(mockAppDataSource.destroy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database connection closed');
      expect(mockLogger.info).toHaveBeenCalledWith('Closed out remaining connections');
      expect(firstExitCode).toBe(0); // Check the first exit code, not the last one
    });

    it('should handle graceful shutdown without database connection', async () => {
      mockAppDataSource.isInitialized = false;
      
      let serverCloseCallback: any = null;
      mockServer.close.mockImplementation((callback: any) => {
        serverCloseCallback = callback;
      });

      let firstExitCode: any = null;
      mockProcessExit.mockImplementation((code?: any) => {
        if (firstExitCode === null) {
          firstExitCode = code;
        }
        processExitCode = code;
        throw new Error(`process.exit(${code})`);
      });

      // Start shutdown
      shutdownHandler();
      
      // Verify initial shutdown steps
      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockServer.close).toHaveBeenCalled();

      // Manually trigger the server close callback
      try {
        if (serverCloseCallback) {
          await serverCloseCallback();
        }
      } catch (e) {
        // Expected to throw when process.exit is called
      }

      expect(mockAppDataSource.destroy).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Closed out remaining connections');
      expect(firstExitCode).toBe(0);
    });

    it('should handle database cleanup error during shutdown', async () => {
      mockAppDataSource.isInitialized = true;
      const dbError = new Error('Database cleanup failed');
      mockAppDataSource.destroy.mockRejectedValue(dbError);
      
      let serverCloseCallback: any = null;
      mockServer.close.mockImplementation((callback: any) => {
        serverCloseCallback = callback;
      });

      let firstExitCode: any = null;
      mockProcessExit.mockImplementation((code?: any) => {
        if (firstExitCode === null) {
          firstExitCode = code;
        }
        processExitCode = code;
        throw new Error(`process.exit(${code})`);
      });

      // Start shutdown
      shutdownHandler();
      
      // Verify initial shutdown steps
      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockServer.close).toHaveBeenCalled();

      // Manually trigger the server close callback
      try {
        if (serverCloseCallback) {
          await serverCloseCallback();
        }
      } catch (e) {
        // Expected to throw when process.exit is called
      }

      expect(mockAppDataSource.destroy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error during shutdown:', dbError);
      expect(firstExitCode).toBe(1); // Should be 1 due to database error
    });

    it('should handle shutdown timeout', async () => {
      // Don't mock server.close callback - simulate hanging connections
      mockServer.close.mockImplementation(() => {
        // Don't call the callback - simulate hanging connections
      });

      let firstExitCode: any = null;
      mockProcessExit.mockImplementation((code?: any) => {
        if (firstExitCode === null) {
          firstExitCode = code;
        }
        processExitCode = code;
        throw new Error(`process.exit(${code})`);
      });

      // Start shutdown
      shutdownHandler();
      
      // Verify initial shutdown steps
      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');
      expect(mockServer.close).toHaveBeenCalled();

      // Manually trigger the timeout handler (stored in timeoutHandlers)
      try {
        if (timeoutHandlers.length > 0) {
          timeoutHandlers[0](); // Execute the timeout handler
        }
      } catch (e) {
        // Expected to throw when process.exit is called
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Could not close connections in time, forcefully shutting down');
      expect(firstExitCode).toBe(1); // Timeout should cause exit(1)
    });

    it('should handle SIGINT signal', async () => {
      const processOnCalls = mockProcessOn.mock.calls;
      const sigintCall = processOnCalls.find(call => call[0] === 'SIGINT');
      const sigintHandler = sigintCall ? sigintCall[1] as () => void : () => {};

      mockAppDataSource.isInitialized = true;
      mockAppDataSource.destroy.mockResolvedValue(undefined);
      
      let serverCloseCallback: any = null;
      mockServer.close.mockImplementation((callback: any) => {
        serverCloseCallback = callback;
      });

      let firstExitCode: any = null;
      mockProcessExit.mockImplementation((code?: any) => {
        if (firstExitCode === null) {
          firstExitCode = code;
        }
        processExitCode = code;
        throw new Error(`process.exit(${code})`);
      });

      // Start shutdown
      sigintHandler();
      
      // Verify initial shutdown steps
      expect(mockLogger.info).toHaveBeenCalledWith('Received kill signal, shutting down gracefully');

      // Manually trigger the server close callback
      try {
        if (serverCloseCallback) {
          await serverCloseCallback();
        }
      } catch (e) {
        // Expected to throw when process.exit is called
      }

      expect(firstExitCode).toBe(0);
    });
  });

  describe('Server Configuration', () => {
    it('should use correct port from config', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it('should use correct environment from config', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      expect(mockLogger.info).toHaveBeenCalledWith('Server is running on port 3000 in test mode');
    });

    it('should use correct API prefix from config', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      expect(mockLogger.info).toHaveBeenCalledWith('API Documentation available at /api/v1/docs');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle app.listen error', async () => {
      const listenError = new Error('Port already in use');
      (mockApp.listen as jest.Mock).mockImplementation(() => {
        throw listenError;
      });

      let firstExitCode: any = null;
      let exitCalled = false;
      mockProcessExit.mockImplementation((code?: any): never => {
        if (!exitCalled) {
          firstExitCode = code;
          exitCalled = true;
        }
        processExitCode = code;
        // Don't throw - just record the exit code
        return undefined as never;
      });

      require('./index');
      
      // Wait for async error handling to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith('Error starting server:', listenError);
      expect(firstExitCode).toBe(1);
    });
  });

  describe('Module Integration', () => {
    it('should import and call createApp', async () => {
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      expect(mockCreateApp).toHaveBeenCalled();
    });

    it('should dynamically import database module during shutdown', async () => {
      // Set up the scenario
      (mockApp.listen as jest.Mock).mockImplementation((port: number, callback: () => void) => {
        setTimeout(callback, 0);
        return mockServer;
      });

      try {
        require('./index');
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        // Expected to not throw during successful startup
      }

      const processOnCalls = mockProcessOn.mock.calls;
      const sigtermCall = processOnCalls.find(call => call[0] === 'SIGTERM');
      const shutdownHandler = sigtermCall ? sigtermCall[1] as () => void : () => {};

      mockAppDataSource.isInitialized = true;
      
      let serverCloseCallback: any = null;
      mockServer.close.mockImplementation((callback: any) => {
        serverCloseCallback = callback;
      });

      let firstExitCode: any = null;
      mockProcessExit.mockImplementation((code?: any) => {
        if (firstExitCode === null) {
          firstExitCode = code;
        }
        processExitCode = code;
        throw new Error(`process.exit(${code})`);
      });

      // Start shutdown
      shutdownHandler();
      
      // Manually trigger the server close callback
      try {
        if (serverCloseCallback) {
          await serverCloseCallback();
        }
      } catch (e) {
        // Expected to throw when process.exit is called
      }

      // Verify that database module was imported during shutdown
      expect(mockAppDataSource.destroy).toHaveBeenCalled();
    });
  });
}); 