import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { GrpcError, MicroserviceError } from '@app/interfaces';

@Injectable()
export class CheckoutService {
  private logger = new Logger(CheckoutService.name);

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

  checkout(userId: string) {
    try {
      return { userId };
    } catch (error) {
      this.handleError(error, 'checkout');
    }
  }
}
