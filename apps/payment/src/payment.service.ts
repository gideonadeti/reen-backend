import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';

import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';

@Injectable()
export class PaymentService implements OnModuleInit {
  constructor(
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
  ) {}

  private productsService: ProductsServiceClient;
  private cartItemsService: CartItemsServiceClient;

  onModuleInit() {
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );
    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
  }
}
