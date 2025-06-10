import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { CartItemsModule } from './cart-items.module';
import { CART_ITEMS_PACKAGE_NAME } from '@app/protos/generated/cart-items';

const bootstrap = async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CartItemsModule,
    {
      transport: Transport.GRPC,
      options: {
        package: CART_ITEMS_PACKAGE_NAME,
        protoPath: join(__dirname, '../../libs/protos/cart-items.proto'),
        url: '0.0.0.0:5002',
      },
    },
  );

  await app.listen();
};

void bootstrap();
