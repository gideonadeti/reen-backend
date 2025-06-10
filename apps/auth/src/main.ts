import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { AuthModule } from './auth.module';
import { AUTH_PACKAGE_NAME } from '@app/protos/generated/auth';

const bootstrap = async () => {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.GRPC,
      options: {
        package: AUTH_PACKAGE_NAME,
        protoPath: join(__dirname, '../../libs/protos/auth.proto'),
        url: '0.0.0.0:5000',
      },
    },
  );

  await app.listen();
};

void bootstrap();
