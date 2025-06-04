import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CartItemsController } from './cart-items.controller';
import { CartItemsService } from './cart-items.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/cart-items/.env',
    }),
  ],
  controllers: [CartItemsController],
  providers: [CartItemsService, PrismaService],
})
export class CartItemsModule {}
