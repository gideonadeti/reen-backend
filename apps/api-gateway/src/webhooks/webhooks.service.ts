import { Inject, Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';

import {
  PAYMENT_PACKAGE_NAME,
  PAYMENT_SERVICE_NAME,
  PaymentServiceClient,
} from '@app/protos/generated/payment';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(PAYMENT_PACKAGE_NAME) private paymentClient: ClientGrpc,
  ) {}

  private paymentService: PaymentServiceClient;

  onModuleInit() {
    this.paymentService = this.paymentClient.getService(PAYMENT_SERVICE_NAME);
  }
}
