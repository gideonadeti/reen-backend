import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { PaymentModule } from './payment.module';
import { PAYMENT_PACKAGE_NAME } from '@app/protos/generated/payment';

const bootstrap = async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentModule,
    {
      transport: Transport.GRPC,
      options: {
        package: PAYMENT_PACKAGE_NAME,
        protoPath: join(__dirname, '../../libs/protos/payment.proto'),
        url: 'localhost:5003',
      },
    },
  );

  await app.listen();
};

void bootstrap();
