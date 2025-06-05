import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { ProductsService } from './products.service';
import {
  CreateRequest,
  DecrementQuantitiesRequest,
  FindAllRequest,
  FindByIdsRequest,
  FindOneRequest,
  PRODUCTS_SERVICE_NAME,
  RemoveRequest,
  UpdateRequest,
} from '@app/protos/generated/products';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  create(data: CreateRequest) {
    return this.productsService.create(data);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  findAll(data: FindAllRequest) {
    return this.productsService.findAll(data);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  findOne(data: FindOneRequest) {
    return this.productsService.findOne(data.id);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  findByIds(data: FindByIdsRequest) {
    return this.productsService.findByIds(data.ids);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  update(data: UpdateRequest) {
    return this.productsService.update(data);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  remove(data: RemoveRequest) {
    return this.productsService.remove(data);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  decrementQuantities(data: DecrementQuantitiesRequest) {
    return this.productsService.decrementQuantities(data.cartItems);
  }

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  incrementQuantities(data: DecrementQuantitiesRequest) {
    return this.productsService.incrementQuantities(data.cartItems);
  }
}
