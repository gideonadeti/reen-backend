import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { CHECKOUT_PACKAGE_NAME } from '@app/protos/generated/checkout';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: CHECKOUT_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: CHECKOUT_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/checkout.proto'),
          url: 'localhost:5004',
        },
      },
    ]),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
