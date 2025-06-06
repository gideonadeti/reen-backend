import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';

import {
  ORDERS_PACKAGE_NAME,
  ORDERS_SERVICE_NAME,
  OrdersServiceClient,
} from '@app/protos/generated/orders';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @Inject(ORDERS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private ordersService: OrdersServiceClient;

  onModuleInit() {
    this.ordersService = this.productsClient.getService(ORDERS_SERVICE_NAME);
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }
}
