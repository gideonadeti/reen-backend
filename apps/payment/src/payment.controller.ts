import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { PaymentService } from './payment.service';
import {
  CheckoutRequest,
  PAYMENT_SERVICE_NAME,
} from '@app/protos/generated/payment';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @GrpcMethod(PAYMENT_SERVICE_NAME)
  checkout(data: CheckoutRequest) {
    return this.paymentService.checkout(data.userId);
  }
}
