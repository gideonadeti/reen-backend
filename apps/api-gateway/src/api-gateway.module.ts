import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv, Keyv } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';

import { AuthModule } from './auth/auth.module';
import { LoggingMiddleware } from './logging/logging.middleware';
import { ProductsModule } from './products/products.module';
import { CartItemsModule } from './cart-items/cart-items.module';
import { CheckoutModule } from './checkout/checkout.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api-gateway/.env',
    }),
    ProductsModule,
    CartItemsModule,
    CheckoutModule,
    WebhooksModule,
    OrdersModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ lruSize: 200 }),
            }),
            createKeyv(configService.get('REDIS_SERVICE_URL') as string),
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
