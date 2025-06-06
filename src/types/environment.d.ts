declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      API_PREFIX: string;
      
      DB_HOST: string;
      DB_PORT: string;
      DB_USERNAME: string;
      DB_PASSWORD: string;
      DB_DATABASE: string;
      DB_SCHEMA: string;
      
      JWT_SECRET: string;
      JWT_EXPIRATION: string;
      JWT_REFRESH_EXPIRATION: string;
      
      LOG_LEVEL: string;
      LOG_FORMAT: string;
      
      RATE_LIMIT_WINDOW: string;
      RATE_LIMIT_MAX_REQUESTS: string;
      
      CORS_ORIGIN: string;
      
      SWAGGER_ENABLED: string;
    }
  }
}

export {}; 