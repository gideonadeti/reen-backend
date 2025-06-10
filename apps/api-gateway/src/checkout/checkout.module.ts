import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { CHECKOUT_PACKAGE_NAME } from '@app/protos/generated/checkout';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: CHECKOUT_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: CHECKOUT_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/checkout.proto'),
            url: configService.get('CHECKOUT_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
