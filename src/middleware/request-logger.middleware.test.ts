import logger from '../utils/logger';
import config from '../config';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
};

const mockConfig = {
  env: 'development',
  logging: {
    format: 'dev',
  },
};

jest.mock('../utils/logger', () => mockLogger);
jest.mock('../config', () => mockConfig);

// Mock morgan
jest.mock('morgan', () => {
  return jest.fn((format, options) => {
    // Store the options for testing
    (global as any).__morganOptions = options;
    return jest.fn(); // Return a mock middleware function
  });
});

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (global as any).__morganOptions;
    // Reset config to default
    mockConfig.env = 'development';
    mockConfig.logging.format = 'dev';
  });

  it('should configure morgan with correct format and options', async () => {
    // Reset modules and reimport
    jest.resetModules();
    const { requestLogger } = await import('./request-logger.middleware');
    
    // Check that morgan options were stored
    const options = (global as any).__morganOptions;
    expect(options).toBeDefined();
    expect(options.stream).toBeDefined();
    expect(options.skip).toBeDefined();
    expect(requestLogger).toBeDefined();
  });

  it('should have stream.write that calls logger.info with trimmed message', async () => {
    // Reset modules and reimport to get fresh instance
    jest.resetModules();
    await import('./request-logger.middleware');
    
    const options = (global as any).__morganOptions;
    const stream = options.stream;

    // Test the write function
    stream.write('  GET /test 200  ');
    expect(mockLogger.info).toHaveBeenCalledWith('GET /test 200');

    // Test with empty string
    mockLogger.info.mockClear();
    stream.write('   ');
    expect(mockLogger.info).toHaveBeenCalledWith('');

    // Test without trim needed
    mockLogger.info.mockClear();
    stream.write('POST /api/users 201');
    expect(mockLogger.info).toHaveBeenCalledWith('POST /api/users 201');
  });

  it('should skip logging when environment is test', async () => {
    // Set environment to test
    mockConfig.env = 'test';
    
    // Reset modules and reimport to pick up new config
    jest.resetModules();
    await import('./request-logger.middleware');
    
    const options = (global as any).__morganOptions;
    const skip = options.skip;

    // Mock req and res objects
    const mockReq = {} as any;
    const mockRes = {} as any;

    const result = skip(mockReq, mockRes);
    expect(result).toBe(true);
  });

  it('should not skip logging when environment is development', async () => {
    // Set environment to development
    mockConfig.env = 'development';
    
    // Reset modules and reimport
    jest.resetModules();
    await import('./request-logger.middleware');
    
    const options = (global as any).__morganOptions;
    const skip = options.skip;

    // Mock req and res objects
    const mockReq = {} as any;
    const mockRes = {} as any;

    const result = skip(mockReq, mockRes);
    expect(result).toBe(false);
  });

  it('should not skip logging when environment is production', async () => {
    // Set environment to production
    mockConfig.env = 'production';
    
    // Reset modules and reimport
    jest.resetModules();
    await import('./request-logger.middleware');
    
    const options = (global as any).__morganOptions;
    const skip = options.skip;

    // Mock req and res objects
    const mockReq = {} as any;
    const mockRes = {} as any;

    const result = skip(mockReq, mockRes);
    expect(result).toBe(false);
  });
}); 