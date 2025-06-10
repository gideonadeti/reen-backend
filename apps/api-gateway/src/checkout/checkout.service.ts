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
  CHECKOUT_PACKAGE_NAME,
  CHECKOUT_SERVICE_NAME,
  CheckoutServiceClient,
} from '@app/protos/generated/checkout';

@Injectable()
export class CheckoutService implements OnModuleInit {
  constructor(
    @Inject(CHECKOUT_PACKAGE_NAME) private checkoutClient: ClientGrpc,
  ) {}

  private logger = new Logger(CheckoutService.name);
  private checkoutService: CheckoutServiceClient;

  onModuleInit() {
    this.checkoutService = this.checkoutClient.getService(
      CHECKOUT_SERVICE_NAME,
    );
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
      return await firstValueFrom(
        this.checkoutService.checkout({
          userId,
        }),
      );
    } catch (error) {
      this.handleError(error, 'checkout');
    }
  }
}
