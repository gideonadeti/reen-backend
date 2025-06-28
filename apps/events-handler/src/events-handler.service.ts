import Stripe from 'stripe';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
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
import { SagaFlowProps } from '@app/interfaces/saga-flow-props/saga-flow-props.interface';
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

        if (!adminOrderItemsMap.has(adminId)) {
          adminOrderItemsMap.set(adminId, []);
        }

        adminOrderItemsMap.get(adminId)!.push(orderItem);
      }

      const updateBalancesRequests = Array.from(
        adminOrderItemsMap.entries(),
      ).map(([adminId, orderItems]) => ({
        userId,
        adminId,
        amount: orderItems.reduce((acc, item) => acc + item.price, 0),
        idempotencyKey: uuidv4(),
      }));

      const applyFinancialEffectsRequests = Array.from(
        adminOrderItemsMap.entries(),
      ).map(([adminId, orderItems]) => ({
        userId,
        adminId,
        amount: orderItems.reduce((acc, item) => acc + item.price, 0),
        idempotencyKey: uuidv4(),
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
        applyFinancialEffectsRequests,
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

  async handleUpdateQuantities(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { cartItems } = payload as HandleCheckoutSessionCompletedPayload;

      // `cartItems` was stringified before being cached, so all `Date` fields (e.g., createdAt)
      // were converted to ISO strings. To satisfy the gRPC proto contract (useDate=true),
      // we need to manually convert them back to JS Date objects before making the request.
      const validCartItems = cartItems.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt as Date),
        updatedAt: new Date(item.updatedAt as Date),
      }));

      await firstValueFrom(
        this.productsService.updateQuantities({
          cartItems: validCartItems,
          increment: false,
        }),
      );

      // Invalidate products cache after updating quantities
      await this.cacheManager.del('/products');

      this.eventsHandlerClient.emit('update-balances', {
        sagaStateId: data.sagaStateId,
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

      // If the reties fail, it is safe to not emit `update-quantities-failed` since no mutations have been made in the successful checkout flow, thus no compensation is necessary.
    }
  }

  async handleUpdateBalances(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { updateBalancesRequests } =
        payload as HandleCheckoutSessionCompletedPayload;

      for (const request of updateBalancesRequests) {
        await firstValueFrom(this.authService.updateBalances(request));
      }

      const idempotencyKeys = updateBalancesRequests.map(
        (request) => request.idempotencyKey,
      );

      await firstValueFrom(
        this.authService.removeIdempotencyRecordsByKeys({
          keys: idempotencyKeys,
        }),
      );

      const userId = updateBalancesRequests[0].userId;
      const adminIds = updateBalancesRequests.map((request) => request.adminId);
      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      const findAdminsResponse = await firstValueFrom(
        this.authService.findAdmins({ adminIds }),
      );

      const admins = findAdminsResponse.admins || [];

      // Invalidate users cache after updating balances
      await this.cacheManager.del(`/auth/users/${user.clerkId}`);

      await Promise.all(
        admins.map((admin) =>
          this.cacheManager.del(`/auth/users/${admin.clerkId}`),
        ),
      );

      this.eventsHandlerClient.emit('clear-cart', {
        sagaStateId: data.sagaStateId,
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

  // Undo Update Quantities
  async handleUpdateBalancesFailed(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { cartItems } = payload as HandleCheckoutSessionCompletedPayload;

      const validCartItems = cartItems.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt as Date),
        updatedAt: new Date(item.updatedAt as Date),
      }));

      await firstValueFrom(
        this.productsService.updateQuantities({
          cartItems: validCartItems,
          increment: false,
        }),
      );

      // Invalidate products cache after updating quantities
      await this.cacheManager.del('/products');
    } catch (error) {
      this.handleError(error, 'compensate update balances');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('update-balances-failed', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      }

      // If the reties fail, just give up...lol
      // I think it'll be best to send a notification to the admin or something.
    }
  }

  async handleClearCart(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { userId } = payload as HandleCheckoutSessionCompletedPayload;

      await firstValueFrom(this.cartItemsService.removeAll({ userId }));

      this.eventsHandlerClient.emit('create-order', {
        sagaStateId: data.sagaStateId,
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

  // Undo Update Balances
  // Undo Update Quantities
  async handleClearCartFailed(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { updateBalancesRequests } =
        payload as HandleCheckoutSessionCompletedPayload;

      // Reverse userId and adminId
      for (const request of updateBalancesRequests) {
        await firstValueFrom(
          this.authService.updateBalances({
            ...request,
            userId: request.adminId,
            adminId: request.userId,
          }),
        );
      }

      const idempotencyKeys = updateBalancesRequests.map(
        (request) => request.idempotencyKey,
      );

      await firstValueFrom(
        this.authService.removeIdempotencyRecordsByKeys({
          keys: idempotencyKeys,
        }),
      );

      const userId = updateBalancesRequests[0].userId;
      const adminIds = updateBalancesRequests.map((request) => request.adminId);
      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      const admins = await firstValueFrom(
        this.authService.findAdmins({ adminIds }),
      );

      // Invalidate users cache after updating balances
      await this.cacheManager.del(`/auth/users/${user.clerkId}`);

      for (const admin of admins.admins) {
        await this.cacheManager.del(`/auth/users/${admin.clerkId}`);
      }

      this.eventsHandlerClient.emit('update-balances-failed', {
        sagaStateId: data.sagaStateId,
      });
    } catch (error) {
      this.handleError(error, 'compensate clear cart');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('clear-cart-failed', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      }
    }
  }

  async handleCreateOrder(data: SagaFlowProps) {
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

      this.eventsHandlerClient.emit('notify-buyer', {
        sagaStateId: data.sagaStateId,
      });
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

  // Undo Clear Cart
  // Undo Update Balances
  // Undo Update Quantities
  async handleCreateOrderFailed(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { userId, cartItems } =
        payload as HandleCheckoutSessionCompletedPayload;

      const createCartItemDtos = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      await firstValueFrom(
        this.cartItemsService.createMany({
          createCartItemDtos,
          userId,
        }),
      );

      this.eventsHandlerClient.emit('clear-cart-failed', {
        sagaStateId: data.sagaStateId,
      });
    } catch (error) {
      this.handleError(error, 'compensate create order');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('create-order-failed', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      }
    }
  }

  async handleNotifyBuyer(data: SagaFlowProps) {
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
        sagaStateId: data.sagaStateId,
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
      }

      // No need to emit 'notify-buyer-failed'
      // It's best to do something about it though
      // Just not worth it atm... :)
    }
  }

  async handleNotifyAdmins(data: SagaFlowProps) {
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

      await this.prismaService.sagaState.delete({
        where: { id: data.sagaStateId },
      });

      await this.cacheManager.del(data.sagaStateId);
    } catch (error) {
      this.handleError(error, 'notify admins');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('notify-admins', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      }

      // No need to emit 'notify-admins-failed'
    }
  }
}
