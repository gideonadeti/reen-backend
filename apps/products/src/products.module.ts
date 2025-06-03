import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/products/.env',
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
})
export class ProductsModule {}
