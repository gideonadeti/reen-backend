import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { ProductsModule } from './products.module';
import { PRODUCTS_PACKAGE_NAME } from '@app/protos/generated/products';

const bootstrap = async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProductsModule,
    {
      transport: Transport.GRPC,
      options: {
        package: PRODUCTS_PACKAGE_NAME,
        protoPath: join(__dirname, '../../libs/protos/products.proto'),
        url: 'localhost:50051',
      },
    },
  );

  await app.listen();
};

void bootstrap();
