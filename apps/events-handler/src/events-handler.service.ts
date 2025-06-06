import Stripe from 'stripe';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { GrpcError, MicroserviceError } from '@app/interfaces';
import { ResendService } from './resend/resend.service';
import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';
import {
  CartItem,
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';
import {
  ORDERS_PACKAGE_NAME,
  ORDERS_SERVICE_NAME,
  OrdersServiceClient,
} from '@app/protos/generated/orders';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
} from '@app/protos/generated/auth';

@Injectable()
export class EventsHandlerService implements OnModuleInit {
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
    @Inject(ORDERS_PACKAGE_NAME) private ordersClient: ClientGrpc,
    @Inject('EVENTS_HANDLER_SERVICE') private eventsHandlerClient: ClientProxy,
    @Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc,
    private readonly resendService: ResendService,
  ) {}

  private cartItemsService: CartItemsServiceClient;
  private productsService: ProductsServiceClient;
  private ordersService: OrdersServiceClient;
  private authService: AuthServiceClient;
  private logger = new Logger(EventsHandlerService.name);

  onModuleInit() {
    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );
    this.ordersService = this.ordersClient.getService(ORDERS_SERVICE_NAME);
    this.authService = this.authClient.getService(AUTH_SERVICE_NAME);
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

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata!.userId;
    let cartItems: CartItem[] = [];
    let didDecrementProducts = false;
    let orderId: string | null = null;

    try {
      const findAllResponse = await firstValueFrom(
        this.cartItemsService.findAll({ userId }),
      );

      cartItems = findAllResponse.cartItems || [];

      await firstValueFrom(
        this.productsService.updateQuantities({ cartItems, increment: false }),
      );

      didDecrementProducts = true;

      const productIds = cartItems.map((cartItem) => cartItem.productId);
      const findByIdsResponse = await firstValueFrom(
        this.productsService.findByIds({ ids: productIds }),
      );
      const products = findByIdsResponse.products || [];
      const productMap = new Map(products.map((p) => [p.id, p]));
      const orderItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(productMap.get(item.productId)?.price),
      }));
      const order = await firstValueFrom(
        this.ordersService.create({
          userId,
          total: session.amount_total! / 100,
          orderItems,
        }),
      );

      orderId = order.id;

      await firstValueFrom(this.cartItemsService.removeAll({ userId }));

      this.eventsHandlerClient.emit('send-order-confirmation', userId);
    } catch (error) {
      await this.undoOperations(cartItems, didDecrementProducts, orderId);

      this.handleError(error, 'handle successful checkout');
    }
  }

  async undoOperations(
    cartItems: CartItem[],
    didDecrementProducts: boolean,
    orderId: string | null,
  ) {
    try {
      if (didDecrementProducts) {
        await firstValueFrom(
          this.productsService.updateQuantities({ cartItems, increment: true }),
        );
      }

      if (orderId) {
        await firstValueFrom(this.ordersService.remove({ id: orderId }));
      }
    } catch (error) {
      this.handleError(error, 'undo operations');
    }
  }

  async handleSendOrderConfirmation(userId: string) {
    try {
      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      await this.resendService.sendOrderConfirmation(
        user.email,
        user.name.split(' ')[0],
      );
    } catch (error) {
      this.logger.error(
        'Failed to send order confirmation',
        (error as Error).stack,
      );
    }
  }
}
