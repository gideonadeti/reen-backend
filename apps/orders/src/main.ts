import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { OrdersModule } from './orders.module';
import { ORDERS_PACKAGE_NAME } from '@app/protos/generated/orders';

const bootstrap = async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersModule,
    {
      transport: Transport.GRPC,
      options: {
        package: ORDERS_PACKAGE_NAME,
        protoPath: join(__dirname, '../../libs/protos/orders.proto'),
        url: '0.0.0.0:5003',
      },
    },
  );

  await app.listen();
};

void bootstrap();
