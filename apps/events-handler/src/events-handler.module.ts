import KeyvRedis from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

import { EventsHandlerController } from './events-handler.controller';
import { EventsHandlerService } from './events-handler.service';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';
import { ORDERS_PACKAGE_NAME } from '@app/protos/generated/orders';
import { RmqLoggingInterceptor } from './rmq-logging/rmq-logging.middleware';
import { AUTH_PACKAGE_NAME } from '@app/protos/generated/auth';
import { ResendService } from './resend/resend.service';
import { MailersendService } from './mailersend/mailersend.service';
import { NodemailerService } from './nodemailer/nodemailer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/events-handler/.env',
    }),
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: CART_ITEMS_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: CART_ITEMS_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/cart-items.proto'),
            url: configService.get('CART-ITEMS_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: PRODUCTS_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: PRODUCTS_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/products.proto'),
            url: configService.get('PRODUCTS_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: ORDERS_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: ORDERS_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/orders.proto'),
            url: configService.get('ORDERS_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
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
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: AUTH_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/auth.proto'),
            url: configService.get('AUTH_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
      },
    ]),
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
  controllers: [EventsHandlerController],
  providers: [
    EventsHandlerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RmqLoggingInterceptor,
    },
    ResendService,
    MailersendService,
    NodemailerService,
  ],
})
export class EventsHandlerModule {}
