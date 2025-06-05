import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { GrpcError, MicroserviceError } from '@app/interfaces';
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
  private logger = new Logger(CheckoutService.name);

  onModuleInit() {
    this.paymentService = this.paymentClient.getService(PAYMENT_SERVICE_NAME);
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as GrpcError).stack);

    const microserviceError = JSON.parse(
      (error as GrpcError).details || '{}',
    ) as MicroserviceError;

    if (microserviceError.name === 'BadRequestException') {
      throw new BadRequestException(microserviceError.message);
    }

    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  async checkout(userId: string) {
    try {
      return await firstValueFrom(this.paymentService.checkout({ userId }));
    } catch (error) {
      this.handleError(error, 'checkout');
    }
  }
}
