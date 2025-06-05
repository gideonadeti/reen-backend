import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { EventsHandlerController } from './events-handler.controller';
import { EventsHandlerService } from './events-handler.service';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';
import { ORDERS_PACKAGE_NAME } from '@app/protos/generated/orders';
import { RmqLoggingInterceptor } from './rmq-logging/rmq-logging.middleware';
import { AUTH_PACKAGE_NAME } from '@app/protos/generated/auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/events-handler/.env',
    }),
    ClientsModule.register([
      {
        name: CART_ITEMS_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: CART_ITEMS_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/cart-items.proto'),
          url: 'localhost:5002',
        },
      },
    ]),
    ClientsModule.register([
      {
        name: PRODUCTS_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: PRODUCTS_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/products.proto'),
          url: 'localhost:5001',
        },
      },
    ]),
    ClientsModule.register([
      {
        name: ORDERS_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: ORDERS_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/orders.proto'),
          url: 'localhost:5003',
        },
      },
    ]),
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: 'EVENTS_HANDLER_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get('MESSAGE_BROKER_URL') as string],
            queue: 'events-handler',
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ClientsModule.register([
      {
        name: AUTH_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: AUTH_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/auth.proto'),
        },
      },
    ]),
  ],
  controllers: [EventsHandlerController],
  providers: [
    EventsHandlerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RmqLoggingInterceptor,
    },
  ],
})
export class EventsHandlerModule {}
