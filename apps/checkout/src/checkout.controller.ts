import { Controller, Get } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@Controller()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get()
  getHello(): string {
    return this.checkoutService.getHello();
  }
}
