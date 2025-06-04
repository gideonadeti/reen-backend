import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { GrpcError } from '@app/interfaces';
import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';

@Injectable()
export class CartItemsService implements OnModuleInit {
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
  ) {}

  private cartItemsService: CartItemsServiceClient;
  private logger = new Logger(CartItemsService.name);

  onModuleInit() {
    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as GrpcError).stack);

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

  findAll() {
    return `This action returns all cartItems`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cartItem`;
  }

  update(id: number, updateCartItemDto: UpdateCartItemDto) {
    return `This action updates a #${id} cartItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} cartItem`;
  }
}
