import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { CartItemsService } from './cart-items.service';
import {
  CART_ITEMS_SERVICE_NAME,
  CreateManyRequest,
  CreateRequest,
  FindAllRequest,
  FindByProductIdRequest,
  FindOneRequest,
  RemoveAllRequest,
  RemoveByProductIdRequest,
  RemoveByProductIdsRequest,
  RemoveRequest,
  UpdateRequest,
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

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  update(data: UpdateRequest) {
    return this.cartItemsService.update(data);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  remove(data: RemoveRequest) {
    return this.cartItemsService.remove(data);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  removeAll(data: RemoveAllRequest) {
    return this.cartItemsService.removeAll(data.userId);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  createMany(data: CreateManyRequest) {
    return this.cartItemsService.createMany(data);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  findByProductId(data: FindByProductIdRequest) {
    return this.cartItemsService.findByProductId(data.productId);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  removeByProductId(data: RemoveByProductIdRequest) {
    return this.cartItemsService.removeByProductId(data.productId);
  }

  @GrpcMethod(CART_ITEMS_SERVICE_NAME)
  removeByProductIds(data: RemoveByProductIdsRequest) {
    return this.cartItemsService.removeByProductIds(data.productIds);
  }
}
