import { RmqLoggingMiddleware } from './rmq-logging.middleware';

describe('RmqLoggingMiddleware', () => {
  it('should be defined', () => {
    expect(new RmqLoggingMiddleware()).toBeDefined();
  });
});
