import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GrpcError, MicroserviceError } from '@app/interfaces';
import { FindAllProductsDto } from './dto/find-all-products.dto';
import {
  Product,
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
} from '@app/protos/generated/auth';
import {
  ORDERS_PACKAGE_NAME,
  ORDERS_SERVICE_NAME,
  OrdersServiceClient,
} from '@app/protos/generated/orders';
import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItem,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
    @Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc,
    @Inject(ORDERS_PACKAGE_NAME) private ordersClient: ClientGrpc,
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private productsService: ProductsServiceClient;
  private authService: AuthServiceClient;
  private ordersService: OrdersServiceClient;
  private cartItemsService: CartItemsServiceClient;
  private logger = new Logger(ProductsService.name);

  onModuleInit() {
    this.authService = this.authClient.getService(AUTH_SERVICE_NAME);
    this.ordersService = this.ordersClient.getService(ORDERS_SERVICE_NAME);
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );

    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
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

  async create(
    userId: string,
    createProductDto: CreateProductDto,
    clerkId: string,
  ) {
    const createProductFee =
      0.04 * createProductDto.price * createProductDto.quantity;

    let wasCharged = false;

    try {
      await firstValueFrom(
        this.authService.chargeFee({
          userId,
          amount: createProductFee,
        }),
      );

      wasCharged = true;

      const product = await firstValueFrom(
        this.productsService.create({
          adminId: userId,
          createProductDto,
        }),
      );

      // Invalidate caches after product creation
      await this.cacheManager.del('/products');
      await this.cacheManager.del('/auth/find-all');
      await this.cacheManager.del(`/auth/users/${clerkId}`);

      return product;
    } catch (error) {
      if (wasCharged) {
        await firstValueFrom(
          this.authService.undoChargeFee({
            amount: createProductFee,
            userId,
          }),
        );
      }

      this.handleError(error, 'create product');
    }
  }

  async findAll(query: FindAllProductsDto) {
    try {
      const findAllResponse = await firstValueFrom(
        this.productsService.findAll(query),
      );

      const products = findAllResponse.products || []; // [] Else gRPC returns undefined when there are no products
      const adminIds = [...new Set(products.map((p) => p.adminId))];
      const findAdminsResponse = await firstValueFrom(
        this.authService.findAdmins({ adminIds }),
      );

      const admins = findAdminsResponse.admins || [];
      const adminMap = new Map(admins.map((a) => [a.id, a]));
      const productIds = products.map((p) => p.id);
      const findProductOrderCountsResponse = await firstValueFrom(
        this.ordersService.findProductOrderCounts({ productIds }),
      );

      const productOrderCounts =
        findProductOrderCountsResponse.productOrderCounts || [];

      const productOrderCountMap = new Map(
        productOrderCounts.map((poc) => [poc.productId, poc.count]),
      );

      if (!query.page && !query.limit) {
        return products.map((product) => ({
          ...product,
          admin: {
            id: product.adminId,
            name: adminMap.get(product.adminId)?.name,
          },
          orderCount: productOrderCountMap.get(product.id) || 0,
        }));
      }

      return {
        ...findAllResponse,
        products: products.map((product) => ({
          ...product,
          admin: {
            id: product.adminId,
            name: adminMap.get(product.adminId)?.name,
          },
        })),
      };
    } catch (error) {
      this.handleError(error, 'fetch products');
    }
  }

  async findOne(id: string) {
    try {
      return await firstValueFrom(this.productsService.findOne({ id }));
    } catch (error) {
      this.handleError(error, `fetch product with id ${id}`);
    }
  }

  async update(
    userId: string,
    id: string,
    updateProductDto: UpdateProductDto,
    clerkId: string,
  ) {
    let updateProductFee = 0;
    let wasCharged = false;

    try {
      const existingProduct = await firstValueFrom(
        this.productsService.findOne({ id }),
      );

      const oldPrice = existingProduct.price;
      const oldQty = existingProduct.quantity;
      const newPrice = Number(updateProductDto.price);
      const newQty = Number(updateProductDto.quantity);
      const oldTotalValue = oldPrice * oldQty;
      const newTotalValue = newPrice * newQty;
      const addedValue = Math.max(0, newTotalValue - oldTotalValue);
      updateProductFee = 0.04 * addedValue;

      if (updateProductFee > 0) {
        await firstValueFrom(
          this.authService.chargeFee({
            amount: updateProductFee,
            userId,
          }),
        );

        wasCharged = true;
      }

      const product = await firstValueFrom(
        this.productsService.update({
          adminId: userId,
          id,
          updateProductDto: {
            ...updateProductDto,
            imageUrls: updateProductDto.imageUrls || [],
          },
        }),
      );

      // Invalidate caches
      await this.cacheManager.del('/products');
      await this.cacheManager.del('/auth/find-all');
      await this.cacheManager.del(`/auth/users/${clerkId}`);

      return product;
    } catch (error) {
      if (wasCharged) {
        await firstValueFrom(
          this.authService.undoChargeFee({
            amount: updateProductFee,
            userId,
          }),
        );
      }

      this.handleError(error, `update product with id ${id}`);
    }
  }

  // Remove all related cart items
  // If there are no related order items, delete product
  // Else, anonymize product admin
  async remove(userId: string, id: string) {
    let cartItems: CartItem[] = [];
    let hasRemovedCartItems = false;
    let product: Product;

    try {
      const findByProductIdResponse = await firstValueFrom(
        this.cartItemsService.findByProductId({
          productId: id,
        }),
      );

      cartItems = findByProductIdResponse.cartItems || [];

      await firstValueFrom(
        this.cartItemsService.removeByProductId({
          productId: id,
        }),
      );

      hasRemovedCartItems = true;

      const findOrderItemsByProductIdResponse = await firstValueFrom(
        this.ordersService.findOrderItemsByProductId({
          productId: id,
        }),
      );

      const orderItems = findOrderItemsByProductIdResponse.orderItems || [];

      if (orderItems.length === 0) {
        product = await firstValueFrom(
          this.productsService.remove({ adminId: userId, id }),
        );
      } else {
        const anonymousUser = await firstValueFrom(
          this.authService.findOrCreateAnonymousUser({}),
        );

        product = await firstValueFrom(
          this.productsService.updateAdminId({
            id,
            newAdminId: anonymousUser.id,
          }),
        );
      }

      // Invalidate products cache after product deletion
      await this.cacheManager.del('/products');

      return product;
    } catch (error) {
      if (hasRemovedCartItems) {
        await firstValueFrom(
          this.cartItemsService.createMany({
            createCartItemDtos: cartItems.map((cartItem) => ({
              productId: cartItem.productId,
              quantity: cartItem.quantity,
            })),
            userId,
          }),
        );
      }

      this.handleError(error, `delete product with id ${id}`);
    }
  }
}
