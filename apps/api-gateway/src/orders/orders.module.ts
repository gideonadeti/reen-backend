import { Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ORDERS_PACKAGE_NAME } from '@app/protos/generated/orders';
import { AUTH_PACKAGE_NAME } from '@app/protos/generated/auth';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';

@Module({
  imports: [
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
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
