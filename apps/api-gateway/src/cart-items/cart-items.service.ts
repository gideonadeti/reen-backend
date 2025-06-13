import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { GrpcError, MicroserviceError } from '@app/interfaces';
import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';

@Injectable()
export class CartItemsService implements OnModuleInit {
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private cartItemsService: CartItemsServiceClient;
  private productsService: ProductsServiceClient;
  private logger = new Logger(CartItemsService.name);

  onModuleInit() {
    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as GrpcError).stack);

    const microserviceError = JSON.parse(
      (error as GrpcError).details || '{}',
    ) as MicroserviceError;

    if (
      microserviceError.name === 'PrismaClientKnownRequestError' &&
      microserviceError.code === 'P2002'
    ) {
      throw new ConflictException('Cart item already exists');
    }

    if (microserviceError.name === 'NotFoundException') {
      throw new NotFoundException(microserviceError.message);
    }

    if (microserviceError.name === 'BadRequestException') {
      throw new BadRequestException(microserviceError.message);
    }

    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  async create(userId: string, createCartItemDto: CreateCartItemDto) {
    try {
      return await firstValueFrom(
        this.cartItemsService.create({
          userId,
          createCartItemDto,
        }),
      );
    } catch (error) {
      this.handleError(error, 'create cart item');
    }
  }

  async findAll(userId: string) {
    try {
      const response = await firstValueFrom(
        this.cartItemsService.findAll({ userId }),
      );

      const cartItems = response.cartItems || [];
      const productIds = [...new Set(cartItems.map((c) => c.productId))];
      const findByIdsResponse = await firstValueFrom(
        this.productsService.findByIds({ ids: productIds }),
      );

      const products = findByIdsResponse.products || [];
      const productMap = new Map(products.map((p) => [p.id, p]));

      return cartItems.map((cartItem) => ({
        ...cartItem,
        product: productMap.get(cartItem.productId),
      }));
    } catch (error) {
      this.handleError(error, 'fetch cart items');
    }
  }

  async findOne(userId: string, id: string) {
    try {
      return await firstValueFrom(
        this.cartItemsService.findOne({ userId, id }),
      );
    } catch (error) {
      this.handleError(error, `fetch cart item with id ${id}`);
    }
  }

  async update(
    userId: string,
    id: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    try {
      return await firstValueFrom(
        this.cartItemsService.update({
          userId,
          id,
          updateCartItemDto,
        }),
      );
    } catch (error) {
      this.handleError(error, `update cart item with id ${id}`);
    }
  }

  async remove(userId: string, id: string) {
    try {
      return await firstValueFrom(this.cartItemsService.remove({ userId, id }));
    } catch (error) {
      this.handleError(error, `delete cart item with id ${id}`);
    }
  }
}
