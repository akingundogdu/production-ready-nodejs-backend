import logger from '../utils/logger';
import config from '../config';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
}));

jest.mock('../config', () => ({
  env: 'development',
  logging: {
    format: 'dev',
  },
}));

// Mock morgan
jest.mock('morgan', () => {
  return jest.fn((format, options) => {
    // Store the options for testing
    (global as any).__morganOptions = options;
    return jest.fn(); // Return a mock middleware function
  });
});

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (global as any).__morganOptions;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should configure morgan with correct format and options', async () => {
    // Import the middleware to trigger morgan setup
    const { requestLogger } = await import('./request-logger.middleware');
    
    // Check that morgan options were stored
    const options = (global as any).__morganOptions;
    expect(options).toBeDefined();
    expect(options.stream).toBeDefined();
    expect(options.skip).toBeDefined();
    expect(requestLogger).toBeDefined();
  });

  it('should have stream.write that calls logger.info with trimmed message', async () => {
    // Import the middleware to trigger morgan setup
    await import('./request-logger.middleware');
    
    const options = (global as any).__morganOptions;
    const stream = options.stream;

    // Test the write function
    stream.write('  GET /test 200  ');
    expect(mockLogger.info).toHaveBeenCalledWith('GET /test 200');

    // Test with empty string
    stream.write('   ');
    expect(mockLogger.info).toHaveBeenCalledWith('');

    // Test without trim needed
    stream.write('POST /api/users 201');
    expect(mockLogger.info).toHaveBeenCalledWith('POST /api/users 201');
  });

  it('should skip logging when environment is test', async () => {
    // Set environment to test
    (config as any).env = 'test';
    
    // Import the middleware to trigger morgan setup
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
    (config as any).env = 'development';
    
    // Import the middleware to trigger morgan setup
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
    (config as any).env = 'production';
    
    // Import the middleware to trigger morgan setup
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