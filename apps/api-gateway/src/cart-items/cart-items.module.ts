import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';

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
  ],
  controllers: [CartItemsController],
  providers: [CartItemsService],
})
export class CartItemsModule {}
