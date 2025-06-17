import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { GrpcError, MicroserviceError } from '@app/interfaces';
import {
  ORDERS_PACKAGE_NAME,
  ORDERS_SERVICE_NAME,
  OrdersServiceClient,
} from '@app/protos/generated/orders';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @Inject(ORDERS_PACKAGE_NAME) private ordersClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private ordersService: OrdersServiceClient;
  private productsService: ProductsServiceClient;
  private logger = new Logger(OrdersService.name);

  onModuleInit() {
    this.ordersService = this.ordersClient.getService(ORDERS_SERVICE_NAME);
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as GrpcError).stack);

    const microserviceError = JSON.parse(
      (error as GrpcError).details || '{}',
    ) as MicroserviceError;

    if (microserviceError.name === 'NotFoundException') {
      throw new NotFoundException(microserviceError.message);
    }

    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  async findAll(userId: string) {
    try {
      const findAllResponse = await firstValueFrom(
        this.ordersService.findAll({
          userId,
        }),
      );

      const orders = findAllResponse.orders || [];
      const productIds = orders.flatMap((order) =>
        order.orderItems.map((item) => item.productId),
      );

      const findByIdsResponse = await firstValueFrom(
        this.productsService.findByIds({
          ids: productIds,
        }),
      );

      const products = findByIdsResponse.products || [];
      const productsMap = new Map(
        products.map((product) => [product.id, product]),
      );

      return orders.map((order) => ({
        ...order,
        orderItems: order.orderItems.map((item) => ({
          ...item,
          product: productsMap.get(item.productId),
        })),
      }));
    } catch (error) {
      this.handleError(error, 'fetch orders');
    }
  }

  async findOne(id: string) {
    try {
      return await firstValueFrom(this.ordersService.findOne({ id }));
    } catch (error) {
      this.handleError(error, `fetch order with id ${id}`);
    }
  }
}
