import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { PrismaService } from './prisma/prisma.service';
import { CreateRequest } from '@app/protos/generated/products';

@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}

  private logger = new Logger(ProductsService.name);

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    throw new RpcException(JSON.stringify(error));
  }

  async create({ adminId, ...createProductDto }: CreateRequest) {
    try {
      return await this.prismaService.product.create({
        data: { ...createProductDto, adminId },
      });
    } catch (error) {
      this.handleError(error, 'create product');
    }
  }
}
