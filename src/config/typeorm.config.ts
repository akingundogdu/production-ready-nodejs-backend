import { DataSourceOptions } from 'typeorm';
import { AppDataSource } from './database';

// This configuration is used by TypeORM CLI
const config: DataSourceOptions = {
  ...AppDataSource.options,
};

export default config; 