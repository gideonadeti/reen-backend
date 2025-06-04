import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, RpcException } from '@nestjs/microservices';

import { PrismaService } from './prisma/prisma.service';
import {
  PRODUCTS_PACKAGE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';
import { CART_ITEMS_SERVICE_NAME } from '@app/protos/generated/cart-items';

@Injectable()
export class CartItemsService implements OnModuleInit {
  constructor(
    private prismaService: PrismaService,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private logger = new Logger(CartItemsService.name);
  private productsService: ProductsServiceClient;

  onModuleInit() {
    this.productsService = this.productsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    throw new RpcException(JSON.stringify(error));
  }
}
