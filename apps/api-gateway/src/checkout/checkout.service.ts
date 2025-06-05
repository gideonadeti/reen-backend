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
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';
import { ClientGrpc } from '@nestjs/microservices';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';

@Injectable()
export class CheckoutService implements OnModuleInit {
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private logger = new Logger(CheckoutService.name);
  private cartItemsService: CartItemsServiceClient;
  private productsService: ProductsServiceClient;

  onModuleInit() {
    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
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

  checkout(userId: string) {
    try {
      return { userId };
    } catch (error) {
      this.handleError(error, 'checkout');
    }
  }
}
