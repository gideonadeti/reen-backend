import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from './prisma/prisma.service';
import { GrpcLoggingInterceptor } from '@app/interceptors';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/orders/.env',
    }),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: GrpcLoggingInterceptor,
    },
  ],
})
export class OrdersModule {}
