import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { CartItemsService } from './cart-items.service';
import {
  CART_ITEMS_SERVICE_NAME,
  CreateRequest,
} from '@app/protos/generated/cart-items';

@Controller()
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  create(data: CreateRequest) {
    return this.cartItemsService.create(data);
  }
}
