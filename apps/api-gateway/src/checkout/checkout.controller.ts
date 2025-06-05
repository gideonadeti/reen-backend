import { Controller, Post, Body } from '@nestjs/common';

import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  checkout() {
    return this.checkoutService.checkout();
  }
}
