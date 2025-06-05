import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';

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
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
