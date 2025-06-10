import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { CheckoutModule } from './checkout.module';
import { CHECKOUT_PACKAGE_NAME } from '@app/protos/generated/checkout';

const bootstrap = async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CheckoutModule,
    {
      transport: Transport.GRPC,
      options: {
        package: CHECKOUT_PACKAGE_NAME,
        protoPath: join(__dirname, '../../libs/protos/checkout.proto'),
        url: '0.0.0.0:5004',
      },
    },
  );

  await app.listen();
};

void bootstrap();
