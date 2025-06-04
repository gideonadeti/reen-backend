import { Controller, Get } from '@nestjs/common';
import { CartItemsService } from './cart-items.service';

@Controller()
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Get()
  getHello(): string {
    return this.cartItemsService.getHello();
  }
}
