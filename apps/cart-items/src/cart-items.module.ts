import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { CartItemsController } from './cart-items.controller';
import { CartItemsService } from './cart-items.service';
import { PrismaService } from './prisma/prisma.service';
import { GrpcLoggingInterceptor } from '@app/interceptors';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/cart-items/.env',
    }),
    ClientsModule.register([
      {
        name: PRODUCTS_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: PRODUCTS_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/products.proto'),
          url: 'localhost:5002',
        },
      },
    ]),
  ],
  controllers: [CartItemsController],
  providers: [
    CartItemsService,
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: GrpcLoggingInterceptor,
    },
  ],
})
export class CartItemsModule {}
