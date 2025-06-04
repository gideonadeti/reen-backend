import { Module } from '@nestjs/common';
import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';

@Module({
  controllers: [CartItemsController],
  providers: [CartItemsService],
})
export class CartItemsModule {}
