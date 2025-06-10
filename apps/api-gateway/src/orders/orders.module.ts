import { Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ORDERS_PACKAGE_NAME } from '@app/protos/generated/orders';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: ORDERS_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: ORDERS_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/orders.proto'),
            url: configService.get('ORDERS_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
