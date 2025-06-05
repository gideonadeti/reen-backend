import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PAYMENT_PACKAGE_NAME } from '@app/protos/generated/payment';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: PAYMENT_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: PAYMENT_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/payment.proto'),
          url: 'localhost:5003',
        },
      },
    ]),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
