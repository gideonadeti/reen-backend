import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { OrdersService } from './orders.service';
import {
  CreateRequest,
  ORDERS_SERVICE_NAME,
} from '@app/protos/generated/orders';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @GrpcMethod(ORDERS_SERVICE_NAME)
  create(data: CreateRequest) {
    return this.ordersService.create(data);
  }
}
