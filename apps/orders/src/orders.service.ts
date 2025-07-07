import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { CreateRequest } from '@app/protos/generated/orders';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  private logger = new Logger(OrdersService.name);

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    throw new RpcException(JSON.stringify(error));
  }

  async create({ userId, total, orderItems }: CreateRequest) {
    try {
      return await this.prismaService.order.create({
        data: {
          userId,
          total,
          orderItems: {
            createMany: {
              data: orderItems,
            },
          },
        },
        include: {
          orderItems: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'create order');
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.order.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      this.handleError(error, 'delete order');
    }
  }

  async findAll(userId: string) {
    try {
      const orders = await this.prismaService.order.findMany({
        where: {
          userId,
        },
        include: {
          orderItems: true,
        },
      });

      return {
        orders,
      };
    } catch (error) {
      this.handleError(error, 'fetch orders');
    }
  }

  async findOne(id: string) {
    try {
      const order = await this.prismaService.order.findUnique({
        where: {
          id,
        },
        include: {
          orderItems: true,
        },
      });

      if (!order) {
        throw new NotFoundException(`Order with id ${id} not found`);
      }

      return order;
    } catch (error) {
      this.handleError(error, `fetch order with id ${id}`);
    }
  }

  async findProductOrderCounts(productIds: string[]) {
    try {
      const productOrderCounts = await this.prismaService.orderItem.groupBy({
        by: ['productId'],
        _count: {
          productId: true,
        },
        where: {
          productId: {
            in: productIds,
          },
        },
      });

      return {
        productOrderCounts: productOrderCounts.map((item) => ({
          productId: item.productId,
          count: item._count.productId,
        })),
      };
    } catch (error) {
      this.handleError(error, 'fetch product order counts');
    }
  }

  async findOrderItemsByProductId(productId: string) {
    try {
      const orderItems = await this.prismaService.orderItem.findMany({
        where: {
          productId,
        },
      });

      return {
        orderItems,
      };
    } catch (error) {
      this.handleError(error, `fetch order items by product id ${productId}`);
    }
  }

  async findReferencedProductIds(productIds: string[]) {
    try {
      const response = await this.prismaService.orderItem.findMany({
        where: {
          productId: {
            in: productIds,
          },
        },
        select: {
          productId: true,
        },
      });

      const productIdsSet = new Set(response.map((item) => item.productId));

      return {
        productIds: Array.from(productIdsSet),
      };
    } catch (error) {
      this.handleError(error, 'find referenced product ids');
    }
  }
}
