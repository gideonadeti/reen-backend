import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
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
        name: CART_ITEMS_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: CART_ITEMS_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/cart-items.proto'),
          url: 'localhost:5002',
        },
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/payment/.env',
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
