import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';
import { GrpcError, MicroserviceError } from '@app/interfaces';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';
import {
  CreateManyRequest,
  CreateRequest,
  FindOneRequest,
  RemoveRequest,
  UpdateRequest,
} from '@app/protos/generated/cart-items';

@Injectable()
export class CartItemsService implements OnModuleInit {
  constructor(
    private prismaService: PrismaService,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private logger = new Logger(CartItemsService.name);
  private productsService: ProductsServiceClient;

  onModuleInit() {
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    // Check if error is a gRPC error and throw it else api-gateway wouldn't parse correctly
    const microserviceError = JSON.parse(
      (error as GrpcError).details || '{}',
    ) as MicroserviceError;

    if (Object.keys(microserviceError).length !== 0) {
      throw new RpcException(JSON.stringify(microserviceError));
    }

    throw new RpcException(JSON.stringify(error));
  }

  async create({ userId, createCartItemDto }: CreateRequest) {
    if (!createCartItemDto) return;

    try {
      const product = await firstValueFrom(
        this.productsService.findOne({ id: createCartItemDto.productId }),
      );

      if (product.quantity < createCartItemDto.quantity) {
        throw new BadRequestException(
          `Product with id ${createCartItemDto.productId} has insufficient quantity`,
        );
      }

      return await this.prismaService.cartItem.create({
        data: { ...createCartItemDto, userId },
      });
    } catch (error) {
      this.handleError(error, 'create cart item');
    }
  }

  async findAll(userId: string) {
    try {
      const cartItems = await this.prismaService.cartItem.findMany({
        where: { userId },
      });

      return {
        cartItems,
      };
    } catch (error) {
      this.handleError(error, `fetch cart items for user with id ${userId}`);
    }
  }

  async findOne({ userId, id }: FindOneRequest) {
    try {
      const cartItem = await this.prismaService.cartItem.findUnique({
        where: { id, userId },
      });

      if (!cartItem) {
        throw new NotFoundException(`Cart item with id ${id} not found`);
      }

      return cartItem;
    } catch (error) {
      this.handleError(error, `fetch cart item with id ${id}`);
    }
  }

  async update({ userId, id, updateCartItemDto }: UpdateRequest) {
    if (!updateCartItemDto) return;

    try {
      const product = await firstValueFrom(
        this.productsService.findOne({
          id: updateCartItemDto.productId,
        }),
      );

      if (product.quantity < updateCartItemDto.quantity) {
        throw new BadRequestException(
          `Product with id ${updateCartItemDto.productId} has insufficient quantity`,
        );
      }

      return await this.prismaService.cartItem.update({
        where: { id, userId },
        data: updateCartItemDto,
      });
    } catch (error) {
      this.handleError(error, `update cart item with id ${id}`);
    }
  }

  async remove({ userId, id }: RemoveRequest) {
    try {
      return await this.prismaService.cartItem.delete({
        where: { id, userId },
      });
    } catch (error) {
      this.handleError(error, `delete cart item with id ${id}`);
    }
  }

  async removeAll(userId: string) {
    try {
      return await this.prismaService.cartItem.deleteMany({
        where: { userId },
      });
    } catch (error) {
      this.handleError(
        error,
        `remove all cart items for user with id ${userId}`,
      );
    }
  }

  async createMany({ createCartItemDtos, userId }: CreateManyRequest) {
    try {
      return await this.prismaService.cartItem.createMany({
        data: createCartItemDtos.map((createCartItemDto) => ({
          ...createCartItemDto,
          userId,
        })),
      });
    } catch (error) {
      this.handleError(
        error,
        `create many cart items for user with id ${userId}`,
      );
    }
  }
}
