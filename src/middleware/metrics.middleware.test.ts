import { Request, Response, NextFunction } from 'express';
import {
  metricsMiddleware,
  getMetrics,
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
} from './metrics.middleware';
import logger from '../utils/logger';

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}));

// Mock prom-client
jest.mock('prom-client', () => ({
  Registry: jest.fn().mockImplementation(() => ({
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: jest.fn().mockResolvedValue('# Sample metrics\nhttp_requests_total 0'),
  })),
  collectDefaultMetrics: jest.fn(),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
  })),
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Metrics Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test',
      route: { path: '/test' },
    };

    mockResponse = {
      on: jest.fn(),
      set: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      statusCode: 200,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('metricsMiddleware', () => {
    it('should call next() and set up response listener', () => {
      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should record metrics when response finishes', () => {
      // Mock Date.now to control timing
      const mockStart = 1000;
      const mockEnd = 1500;
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(mockStart) // Start time
        .mockReturnValueOnce(mockEnd); // End time

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Get the finish handler and call it
      const finishHandler = (mockResponse.on as jest.Mock).mock.calls[0][1];
      finishHandler();

      // Verify metrics were recorded
      expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        path: '/test',
        status: 200,
      });

      expect(httpRequestDurationSeconds.observe).toHaveBeenCalledWith(
        {
          method: 'GET',
          path: '/test',
          status: 200,
        },
        0.5 // (1500 - 1000) / 1000
      );
    });

    it('should use req.path when req.route is undefined', () => {
      const customMockRequest = {
        method: 'GET',
        path: '/fallback-path',
        route: undefined,
      } as Request;

      jest.spyOn(Date, 'now').mockReturnValue(1000);

      metricsMiddleware(customMockRequest, mockResponse as Response, mockNext);

      // Get the finish handler and call it
      const finishHandler = (mockResponse.on as jest.Mock).mock.calls[0][1];
      finishHandler();

      expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        path: '/fallback-path',
        status: 200,
      });
    });

    it('should record metrics with different status codes', () => {
      mockResponse.statusCode = 404;
      jest.spyOn(Date, 'now').mockReturnValue(1000);

      metricsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Get the finish handler and call it
      const finishHandler = (mockResponse.on as jest.Mock).mock.calls[0][1];
      finishHandler();

      expect(httpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        path: '/test',
        status: 404,
      });
    });
  });

  describe('getMetrics', () => {
    it('should return metrics successfully', async () => {
      const mockMetrics = '# Sample metrics\nhttp_requests_total 5';
      (register.metrics as jest.Mock).mockResolvedValue(mockMetrics);

      await getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', register.contentType);
      expect(mockResponse.end).toHaveBeenCalledWith(mockMetrics);
    });

    it('should handle errors when collecting metrics', async () => {
      const mockError = new Error('Metrics collection failed');
      (register.metrics as jest.Mock).mockRejectedValue(mockError);

      await getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Error collecting metrics:', mockError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error collecting metrics' });
    });

    it('should handle synchronous errors when collecting metrics', async () => {
      const mockError = new Error('Sync metrics error');
      (register.metrics as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      await getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.error).toHaveBeenCalledWith('Error collecting metrics:', mockError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Error collecting metrics' });
    });
  });

  describe('metrics setup', () => {
    it('should export required metrics objects', () => {
      expect(register).toBeDefined();
      expect(httpRequestsTotal).toBeDefined();
      expect(httpRequestDurationSeconds).toBeDefined();
    });

    it('should have correct metric configurations', () => {
      expect(httpRequestsTotal.inc).toBeDefined();
      expect(httpRequestDurationSeconds.observe).toBeDefined();
    });
  });
}); 