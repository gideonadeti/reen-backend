import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import {
  CreateRequest,
  FindAllRequest,
  FindOneRequest,
  FindProductOrderCountsRequest,
  ORDERS_SERVICE_NAME,
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
}
