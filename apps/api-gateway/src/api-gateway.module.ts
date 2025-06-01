import { MiddlewareConsumer, Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { ApiGatewayLoggingMiddleware } from '@app/middlewares';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiGatewayLoggingMiddleware).forRoutes('*');
  }
}
