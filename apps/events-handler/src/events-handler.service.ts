import Stripe from 'stripe';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';

import { ResendService } from './resend/resend.service';
import { AdminNotificationPayload } from '@app/interfaces/admin-notification-payload/admin-notification-payload.interface';
import { PrismaService } from './prisma/prisma.service';
import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';
import {
  CartItem,
  Product,
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
  UpdateBalancesRequest,
} from '@app/protos/generated/auth';

@Injectable()
export class EventsHandlerService
  implements OnModuleInit, OnApplicationBootstrap
{
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
    @Inject(ORDERS_PACKAGE_NAME) private ordersClient: ClientGrpc,
    @Inject('EVENTS_HANDLER_SERVICE') private eventsHandlerClient: ClientProxy,
    @Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly resendService: ResendService,
    private prismaService: PrismaService,
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

  async onApplicationBootstrap() {
    await this.eventsHandlerClient.connect();
  }

  // No point throw errors here
  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);
  }

  private async undoOperations(
    cartItems: CartItem[],
    updateBalancesRequests: UpdateBalancesRequest[],
    didDecrementProducts: boolean,
    didUpdateBalances: boolean,
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

      if (didUpdateBalances) {
        // Reverse the balance updates
        await Promise.all(
          updateBalancesRequests.map((updateBalanceRequest) =>
            firstValueFrom(
              this.authService.updateBalances({
                userId: updateBalanceRequest.adminId,
                adminId: updateBalanceRequest.userId,
                amount: updateBalanceRequest.amount,
              }),
            ),
          ),
        );
      }
    } catch (error) {
      this.handleError(error, 'undo operations');
    }
  }

  private getAllUserIds(payloads: AdminNotificationPayload[]) {
    const userIdSet = new Set<string>();

    for (const payload of payloads) {
      userIdSet.add(payload.userId); // buyer
      userIdSet.add(payload.adminId); // seller
    }

    return Array.from(userIdSet);
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata!.userId;
    let cartItems: CartItem[] = [];
    let updateBalancesRequests: UpdateBalancesRequest[] = [];
    let didDecrementProducts = false;
    let didUpdateBalances = false;
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
        price: Number(productMap.get(item.productId)?.price) * item.quantity,
      }));

      const order = await firstValueFrom(
        this.ordersService.create({
          userId,
          total: session.amount_total! / 100,
          orderItems,
        }),
      );

      orderId = order.id;

      const orderItemsWithProduct = orderItems.map((orderItem) => {
        const product = productMap.get(orderItem.productId) as Product;

        return {
          ...orderItem,
          product,
        };
      });

      const adminOrderItemsMap = new Map<
        string,
        typeof orderItemsWithProduct
      >();

      for (const orderItem of orderItemsWithProduct) {
        const adminId = orderItem.product.adminId;

        if (!adminOrderItemsMap.has(adminId))
          adminOrderItemsMap.set(adminId, []);

        adminOrderItemsMap.get(adminId)!.push(orderItem);
      }

      updateBalancesRequests = Array.from(adminOrderItemsMap.entries()).map(
        ([adminId, orderItems]) => ({
          userId,
          adminId,
          amount: orderItems.reduce((acc, item) => acc + item.price, 0),
        }),
      );

      for (const req of updateBalancesRequests) {
        await firstValueFrom(this.authService.updateBalances(req));
      }

      didUpdateBalances = true;

      await firstValueFrom(this.cartItemsService.removeAll({ userId }));

      this.eventsHandlerClient.emit('send-order-confirmation', userId);

      const adminNotificationPayloads = Array.from(
        adminOrderItemsMap.entries(),
      ).map(([adminId, orderItems]) => ({
        adminId,
        userId,
        orderItems,
      }));

      this.eventsHandlerClient.emit(
        'send-admin-notifications',
        adminNotificationPayloads,
      );
    } catch (error) {
      await this.undoOperations(
        cartItems,
        updateBalancesRequests,
        didDecrementProducts,
        didUpdateBalances,
        orderId,
      );

      this.handleError(error, 'handle successful checkout');
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

  async handleSendAdminNotifications(
    adminNotificationPayloads: AdminNotificationPayload[],
  ) {
    try {
      const allUserIds = this.getAllUserIds(adminNotificationPayloads);
      const findByIdsResponse = await firstValueFrom(
        this.authService.findByIds({ ids: allUserIds }),
      );
      const users = findByIdsResponse.users || [];
      const userMap = new Map(users.map((user) => [user.id, user]));

      await Promise.all(
        adminNotificationPayloads.map(async (payload) => {
          const admin = userMap.get(payload.adminId);
          const buyer = userMap.get(payload.userId);

          if (!admin || !buyer) return;

          await this.resendService.sendAdminNotification(
            admin.email,
            admin.name.split(' ')[0],
            buyer.name,
            payload.orderItems,
          );
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to send admin notifications',
        (error as Error).stack,
      );
    }
  }
}
