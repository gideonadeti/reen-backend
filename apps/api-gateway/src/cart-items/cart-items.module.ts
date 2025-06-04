import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';

@Module({
  imports: [
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
  ],
  controllers: [CartItemsController],
  providers: [CartItemsService],
})
export class CartItemsModule {}
