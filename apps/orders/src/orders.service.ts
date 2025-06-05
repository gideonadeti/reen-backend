import { Injectable, Logger } from '@nestjs/common';
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
}
