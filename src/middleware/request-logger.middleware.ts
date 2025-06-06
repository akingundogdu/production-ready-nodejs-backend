import morgan from 'morgan';
import config from '../config';
import logger from '../utils/logger';

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

const skip = () => {
  return config.env === 'test';
};

export const requestLogger = morgan(config.logging.format, { stream, skip }); 