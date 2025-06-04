import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { PrismaService } from './prisma/prisma.service';
import { Prisma } from '../generated/prisma';
import {
  CreateProductDto,
  CreateRequest,
  FindAllRequest,
} from '@app/protos/generated/products';

@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}

  private logger = new Logger(ProductsService.name);

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    throw new RpcException(JSON.stringify(error));
  }

  async create({ adminId, createProductDto }: CreateRequest) {
    try {
      return await this.prismaService.product.create({
        data: { ...(createProductDto as CreateProductDto), adminId },
      });
    } catch (error) {
      this.handleError(error, 'create product');
    }
  }

  private getWhereConditions(query: FindAllRequest) {
    const { name, minPrice, maxPrice, minQuantity, maxQuantity } = query;
    const whereConditions: Prisma.ProductWhereInput = {};

    if (name) {
      whereConditions.name = { contains: name, mode: 'insensitive' };
    }

    if (minPrice || maxPrice) {
      whereConditions.price = {};

      if (minPrice) whereConditions.price.gte = minPrice;
      if (maxPrice) whereConditions.price.lte = maxPrice;
    }

    if (minQuantity || maxQuantity) {
      whereConditions.quantity = {};

      if (minQuantity) whereConditions.quantity.gte = minQuantity;
      if (maxQuantity) whereConditions.quantity.lte = maxQuantity;
    }

    return whereConditions;
  }

  async findAll(query: FindAllRequest) {
    const { sortBy, order, limit, page } = query;
    const whereConditions = this.getWhereConditions(query);

    try {
      if (!page && !limit) {
        const products = await this.prismaService.product.findMany({
          where: whereConditions,
          orderBy: { [sortBy || 'createdAt']: order || 'desc' },
        });

        return {
          products,
          meta: {},
        };
      }

      const numberPage = page || 1;
      const numberLimit = limit || 10;
      const total = await this.prismaService.product.count({
        where: whereConditions,
      });
      const lastPage = Math.ceil(total / numberLimit);
      const products = await this.prismaService.product.findMany({
        where: whereConditions,
        orderBy: { [sortBy || 'createdAt']: order || 'desc' },
        skip: (numberPage - 1) * numberLimit,
        take: numberLimit,
      });

      return {
        products,
        meta: {
          total,
          page: numberPage,
          lastPage,
          hasNextPage: numberPage < lastPage,
          hasPreviousPage: numberPage > 1,
        },
      };
    } catch (error) {
      this.handleError(error, 'fetch products');
    }
  }

  async findOne(id: string) {
    try {
      return await this.prismaService.product.findUnique({ where: { id } });
    } catch (error) {
      this.handleError(error, `fetch product with id ${id}`);
    }
  }
}
