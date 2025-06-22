import KeyvRedis from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Inject,
  Logger,
  MiddlewareConsumer,
  Module,
  OnModuleInit,
} from '@nestjs/common';

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
        const redisServiceUrl = configService.get(
          'REDIS_SERVICE_URL',
        ) as string;
        return {
          stores: [new KeyvRedis(redisServiceUrl)],
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule implements OnModuleInit {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private logger = new Logger(ApiGatewayModule.name);

  async onModuleInit() {
    this.logger.log('Clearing cache...');

    const response = await this.cacheManager.clear();

    if (response) {
      this.logger.log('Cache cleared successfully');
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
