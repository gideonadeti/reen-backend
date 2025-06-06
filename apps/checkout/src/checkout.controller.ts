import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { CheckoutService } from './checkout.service';
import {
  CHECKOUT_SERVICE_NAME,
  CheckoutRequest,
} from '@app/protos/generated/checkout';

@Controller()
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @GrpcMethod(CHECKOUT_SERVICE_NAME)
  create(data: CheckoutRequest) {
    return this.checkoutService.checkout(data.userId);
  }
}
