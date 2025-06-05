import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';

import {
  PAYMENT_PACKAGE_NAME,
  PAYMENT_SERVICE_NAME,
  PaymentServiceClient,
} from '@app/protos/generated/payment';

@Injectable()
export class CheckoutService implements OnModuleInit {
  constructor(
    @Inject(PAYMENT_PACKAGE_NAME) private paymentClient: ClientGrpc,
  ) {}

  private paymentService: PaymentServiceClient;

  onModuleInit() {
    this.paymentService = this.paymentClient.getService(PAYMENT_SERVICE_NAME);
  }

  checkout(userId: string) {
    return { userId };
  }
}
