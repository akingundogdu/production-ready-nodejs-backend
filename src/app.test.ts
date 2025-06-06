import request from 'supertest';
import createApp from './app';

describe('App', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/v1', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'API is working' });
    });
  });

  describe('GET /not-found', () => {
    it('should return 404 Not Found', async () => {
      const response = await request(app).get('/not-found');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Not found' });
    });
  });
}); 