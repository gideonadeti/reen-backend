import { ApiGatewayLoggingMiddleware } from './api-gateway-logging.middleware';

describe('ApiGatewayLoggingMiddleware', () => {
  it('should be defined', () => {
    expect(new ApiGatewayLoggingMiddleware()).toBeDefined();
  });
});
