import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { CartItemsService } from './cart-items.service';
import {
  CART_ITEMS_SERVICE_NAME,
  CreateRequest,
  FindAllRequest,
  FindOneRequest,
} from '@app/protos/generated/cart-items';

@Controller()
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  create(data: CreateRequest) {
    return this.cartItemsService.create(data);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  findAll(data: FindAllRequest) {
    return this.cartItemsService.findAll(data.userId);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  findOne(data: FindOneRequest) {
    return this.cartItemsService.findOne(data);
  }
}
