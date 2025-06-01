import { GrpcLoggingInterceptor } from './grpc-logging.interceptor';

describe('GrpcLoggingInterceptor', () => {
  it('should be defined', () => {
    expect(new GrpcLoggingInterceptor()).toBeDefined();
  });
});
