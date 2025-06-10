import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: CART_ITEMS_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: CART_ITEMS_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/cart-items.proto'),
            url: configService.get('CART_ITEMS_SERVICE_URL') as string,
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/checkout/.env',
    }),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
