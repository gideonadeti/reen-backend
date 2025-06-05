import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { PrismaService } from './prisma/prisma.service';
import { Prisma } from '../generated/prisma';
import {
  CartItem,
  CreateProductDto,
  CreateRequest,
  FindAllRequest,
  RemoveRequest,
  UpdateProductDto,
  UpdateRequest,
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
      const product = await this.prismaService.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with id ${id} not found`);
      }

      return product;
    } catch (error) {
      this.handleError(error, `fetch product with id ${id}`);
    }
  }

  async findByIds(ids: string[]) {
    try {
      const products = await this.prismaService.product.findMany({
        where: { id: { in: ids } },
      });

      return {
        products,
      };
    } catch (error) {
      this.handleError(error, `fetch products with ids ${ids.join(', ')}`);
    }
  }

  async update({ adminId, id, updateProductDto }: UpdateRequest) {
    try {
      return await this.prismaService.product.update({
        where: { adminId, id },
        data: updateProductDto as UpdateProductDto,
      });
    } catch (error) {
      this.handleError(error, `update product with id ${id}`);
    }
  }

  async remove({ adminId, id }: RemoveRequest) {
    try {
      return await this.prismaService.product.delete({
        where: { adminId, id },
      });
    } catch (error) {
      this.handleError(error, `delete product with id ${id}`);
    }
  }

  async decrementQuantities(cartItems: CartItem[]) {
    try {
      return await this.prismaService.$transaction(
        cartItems.map((cartItem) =>
          this.prismaService.product.update({
            where: {
              id: cartItem.productId,
              quantity: {
                gte: cartItem.quantity,
              },
            },
            data: {
              quantity: {
                decrement: cartItem.quantity,
              },
            },
          }),
        ),
      );
    } catch (error) {
      this.handleError(error, 'decrement quantities');
    }
  }

  async incrementQuantities(cartItems: CartItem[]) {
    try {
      return await this.prismaService.$transaction(
        cartItems.map((cartItem) =>
          this.prismaService.product.update({
            where: { id: cartItem.productId },
            data: {
              quantity: {
                increment: cartItem.quantity,
              },
            },
          }),
        ),
      );
    } catch (error) {
      this.handleError(error, 'increment quantities');
    }
  }
}
