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
import { HandleCheckoutSessionCompletedPayload } from '@app/interfaces/handle-checkout-session-completed-payload/handle-checkout-session-completed-payload.interface';
import { InputJsonValue } from '../generated/prisma/runtime/library';
import {
  CART_ITEMS_PACKAGE_NAME,
  CART_ITEMS_SERVICE_NAME,
  CartItemsServiceClient,
} from '@app/protos/generated/cart-items';
import {
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

  private getAllUserIds(payloads: AdminNotificationPayload[]) {
    const userIdSet = new Set<string>();

    for (const payload of payloads) {
      userIdSet.add(payload.userId); // buyer
      userIdSet.add(payload.adminId); // seller
    }

    return Array.from(userIdSet);
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    try {
      const userId = session.metadata!.userId;
      const findAllResponse = await firstValueFrom(
        this.cartItemsService.findAll({ userId }),
      );

      const cartItems = findAllResponse.cartItems || [];
      const total = session.amount_total! / 100;
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

      const updateBalancesRequests = Array.from(
        adminOrderItemsMap.entries(),
      ).map(([adminId, orderItems]) => ({
        userId,
        adminId,
        amount: orderItems.reduce((acc, item) => acc + item.price, 0),
      }));

      const adminNotificationPayloads = Array.from(
        adminOrderItemsMap.entries(),
      ).map(([adminId, orderItems]) => ({
        adminId,
        userId,
        orderItems,
      }));

      const payload: HandleCheckoutSessionCompletedPayload = {
        cartItems,
        userId,
        total,
        orderItems,
        updateBalancesRequests,
        adminNotificationPayloads,
      };

      const sagaState = await this.prismaService.sagaState.create({
        data: {
          payload: JSON.parse(JSON.stringify(payload)) as InputJsonValue,
        },
      });

      await this.cacheManager.set(sagaState.id, sagaState.payload);

      this.eventsHandlerClient.emit('update-quantities', {
        sagaStateId: sagaState.id,
      });
    } catch (error) {
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

  async handleUpdateQuantities(data: {
    sagaStateId: string;
    retryCount?: number;
  }) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { cartItems } = payload as HandleCheckoutSessionCompletedPayload;

      await firstValueFrom(
        this.productsService.updateQuantities({ cartItems, increment: false }),
      );

      this.eventsHandlerClient.emit('update-balances', {
        ...data,
        retryCount: 0,
      });
    } catch (error) {
      this.handleError(error, 'update quantities');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('update-quantities', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      }
    }
  }

  async handleUpdateBalances(data: {
    sagaStateId: string;
    retryCount?: number;
  }) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { updateBalancesRequests } =
        payload as HandleCheckoutSessionCompletedPayload;

      for (const request of updateBalancesRequests) {
        await firstValueFrom(this.authService.updateBalances(request));
      }

      this.eventsHandlerClient.emit('clear-cart', {
        ...data,
        retryCount: 0,
      });
    } catch (error) {
      this.handleError(error, 'update balances');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('update-balances', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit('update-balances-failed', {
          sagaStateId: data.sagaStateId,
        });
      }
    }
  }

  async handleClearCart(data: { sagaStateId: string; retryCount?: number }) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { userId } = payload as HandleCheckoutSessionCompletedPayload;

      await firstValueFrom(this.cartItemsService.removeAll({ userId }));

      this.eventsHandlerClient.emit('create-order', {
        ...data,
        retryCount: 0,
      });
    } catch (error) {
      this.handleError(error, 'clear cart');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('clear-cart', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit('clear-cart-failed', {
          sagaStateId: data.sagaStateId,
        });
      }
    }
  }

  async handleCreateOrder(data: { sagaStateId: string; retryCount?: number }) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { userId, total, orderItems } =
        payload as HandleCheckoutSessionCompletedPayload;

      await firstValueFrom(
        this.ordersService.create({
          userId,
          total,
          orderItems,
        }),
      );

      this.eventsHandlerClient.emit('notify-buyer', userId);
    } catch (error) {
      this.handleError(error, 'create order');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('create-order', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit('create-order-failed', {
          sagaStateId: data.sagaStateId,
        });
      }
    }
  }

  async handleNotifyBuyer(data: { sagaStateId: string; retryCount?: number }) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { userId } = payload as HandleCheckoutSessionCompletedPayload;
      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      await this.resendService.sendOrderConfirmation(
        user.email,
        user.name.split(' ')[0],
      );

      this.eventsHandlerClient.emit('notify-admins', {
        ...data,
        retryCount: 0,
      });
    } catch (error) {
      this.handleError(error, 'notify buyer');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('notify-buyer', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit('notify-buyer-failed', {
          sagaStateId: data.sagaStateId,
        });
      }
    }
  }

  async handleNotifyAdmins(data: { sagaStateId: string; retryCount?: number }) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { adminNotificationPayloads } =
        payload as HandleCheckoutSessionCompletedPayload;

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
      this.handleError(error, 'notify admins');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('notify-admins', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit('notify-admins-failed', {
          sagaStateId: data.sagaStateId,
        });
      }
    }
  }
}
