import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import {
  CreateRequest,
  FindAllRequest,
  FindOneRequest,
  FindOrderItemsByProductIdRequest,
  FindProductOrderCountsRequest,
  FindReferencedProductIdsRequest,
  ORDERS_SERVICE_NAME,
  RemoveAllRequest,
  RemoveRequest,
} from '@app/protos/generated/orders';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @GrpcMethod(ORDERS_SERVICE_NAME)
  create(data: CreateRequest) {
    return this.ordersService.create(data);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  remove(data: RemoveRequest) {
    return this.ordersService.remove(data.id);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  findAll(data: FindAllRequest) {
    return this.ordersService.findAll(data.userId);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  findOne(data: FindOneRequest) {
    return this.ordersService.findOne(data.id);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  findProductOrderCounts(data: FindProductOrderCountsRequest) {
    return this.ordersService.findProductOrderCounts(data.productIds);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  findOrderItemsByProductId(data: FindOrderItemsByProductIdRequest) {
    return this.ordersService.findOrderItemsByProductId(data.productId);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  removeAll(data: RemoveAllRequest) {
    return this.ordersService.removeAll(data.userId);
  }

  @GrpcMethod(ORDERS_SERVICE_NAME)
  findReferencedProductIds(data: FindReferencedProductIdsRequest) {
    return this.ordersService.findReferencedProductIds(data.productIds);
  }
}
