import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CheckoutService } from './checkout.service';
import { UserId } from '../auth/decorators/user-id.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  checkout(@UserId() userId: string) {
    return this.checkoutService.checkout(userId);
  }
}
