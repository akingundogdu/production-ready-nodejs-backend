import { DataSource } from 'typeorm';
import config from './index';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  schema: config.db.schema,
  synchronize: false, // Never true in production
  logging: config.env === 'development',
  entities: [path.join(__dirname, '../models/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  subscribers: [path.join(__dirname, '../subscribers/**/*{.ts,.js}')],
  maxQueryExecutionTime: 1000, // Log slow queries
  connectTimeoutMS: 10000,
  extra: {
    max: 25, // Connection pool size
  },
}); 