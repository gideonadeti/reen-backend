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

import { AdminNotificationPayload } from '@app/interfaces/admin-notification-payload/admin-notification-payload.interface';
import { HandleCheckoutSessionCompletedPayload } from '@app/interfaces/handle-checkout-session-completed-payload/handle-checkout-session-completed-payload.interface';
import { SagaFlowProps } from '@app/interfaces/saga-flow-props/saga-flow-props.interface';
import { NodemailerService } from './nodemailer/nodemailer.service';
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
    private readonly nodemailerService: NodemailerService,
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

  // Prepare all relevant data for the saga flow
  // Store data in cache with a unique saga state ID
  // Update product quantities
  // Update financial infos for user and admins
  // Clear user's cart items
  // Create order
  // Update purchases and sales counts for user and admins
  // Notify buyer and admins
  // Clear cache
  async handleCheckoutSessionCompleted(data: {
    session: Stripe.Checkout.Session;
    retryCount?: number;
  }) {
    try {
      const userId = data.session.metadata!.userId;
      const findAllResponse = await firstValueFrom(
        this.cartItemsService.findAll({ userId }),
      );

      const cartItems = findAllResponse.cartItems || [];
      const total = data.session.amount_total! / 100;
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

      const adminIds = Array.from(adminOrderItemsMap.entries()).map(
        ([adminId]) => adminId,
      );

      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      const findAdminsResponse = await firstValueFrom(
        this.authService.findAdmins({ adminIds }),
      );

      const admins = findAdminsResponse.admins || [];

      const updateFinancialInfosRequests = Array.from(
        adminOrderItemsMap.entries(),
      ).map(([adminId, orderItems]) => ({
        userId,
        adminId,
        amount: orderItems.reduce((acc, item) => acc + item.price, 0),
        userNewBalance: user.balance - total,
        adminNewBalance:
          admins.find((a) => a.id === adminId)!.balance +
          orderItems.reduce((acc, item) => acc + item.price, 0),
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
        updateFinancialInfosRequests,
        adminNotificationPayloads,
        orderId: '',
      };

      const sagaStateId = uuidv4();

      await this.cacheManager.set(sagaStateId, payload);

      this.eventsHandlerClient.emit('update-quantities', {
        sagaStateId,
      });
    } catch (error) {
      this.handleError(error, 'handle successful checkout');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('checkout-session-completed', {
          session: data.session,
          retryCount: retryCount + 1,
        });
      }

      // Give up after retries
    }
  }

  async handleUpdateQuantities(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
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

      this.eventsHandlerClient.emit('update-financial-infos', {
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

  async handleUpdateFinancialInfos(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
      const { updateFinancialInfosRequests, userId } =
        payload as HandleCheckoutSessionCompletedPayload;

      for (const request of updateFinancialInfosRequests) {
        await firstValueFrom(this.authService.updateFinancialInfos(request));
      }

      const adminIds = updateFinancialInfosRequests.map(
        (request) => request.adminId,
      );

      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      const findAdminsResponse = await firstValueFrom(
        this.authService.findAdmins({ adminIds }),
      );

      const admins = findAdminsResponse.admins || [];

      // Invalidate caches after updating financial infos
      await this.cacheManager.del('/auth/find-all');
      await this.cacheManager.del(`/auth/users/${user.clerkId}`);
      await Promise.all(
        admins.map((admin) =>
          this.cacheManager.del(`/auth/users/${admin.clerkId}`),
        ),
      );

      const idempotencyKeys = updateFinancialInfosRequests.map(
        (request) => request.idempotencyKey,
      );

      await firstValueFrom(
        this.authService.removeIdempotencyRecordsByKeys({
          keys: idempotencyKeys,
        }),
      );

      this.eventsHandlerClient.emit('clear-cart', {
        sagaStateId: data.sagaStateId,
      });
    } catch (error) {
      this.handleError(error, 'update financial infos');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('update-financial-infos', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit('update-financial-infos-failed', {
          sagaStateId: data.sagaStateId,
        });
      }
    }
  }

  // Undo Update Quantities
  async handleUpdateFinancialInfosFailed(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
      const { cartItems } = payload as HandleCheckoutSessionCompletedPayload;

      const validCartItems = cartItems.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt as Date),
        updatedAt: new Date(item.updatedAt as Date),
      }));

      await firstValueFrom(
        this.productsService.updateQuantities({
          cartItems: validCartItems,
          increment: true,
        }),
      );

      // Invalidate products cache after updating quantities
      await this.cacheManager.del('/products');
    } catch (error) {
      this.handleError(error, 'compensate update financial infos');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('update-financial-infos-failed', {
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
      const { sagaStateId, userId } = data;

      // If there is a sagaStateId, it means userId is in the payload
      // And this is the checkout-session-completed flow
      if (sagaStateId) {
        const payload = await this.cacheManager.get(sagaStateId);
        const { userId } = payload as HandleCheckoutSessionCompletedPayload;

        await firstValueFrom(this.cartItemsService.removeAll({ userId }));

        this.eventsHandlerClient.emit('create-order', {
          sagaStateId: data.sagaStateId,
        });
      } else {
        // If there is no sagaStateId, it means userId is in data
        // And this is a separate flow
        // Specifically the user-deleted flow
        await firstValueFrom(
          this.cartItemsService.removeAll({ userId: userId as string }),
        );

        this.eventsHandlerClient.emit('remove-products-cart-items', {
          userId,
        });
      }
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

  // Undo Update Financial Infos
  // Undo Update Quantities
  async handleClearCartFailed(data: SagaFlowProps) {
    // If there is no sagaStateId, it means this is a separate flow
    // Specifically the user-deleted flow
    // This is first operation after the user is deleted
    // So, safe to just return
    if (!data.sagaStateId) {
      return;
    }

    try {
      const payload = await this.cacheManager.get(data.sagaStateId);
      const { updateFinancialInfosRequests, userId } =
        payload as HandleCheckoutSessionCompletedPayload;

      for (const request of updateFinancialInfosRequests) {
        await firstValueFrom(
          this.authService.undoUpdateFinancialInfos(request),
        );
      }

      const adminIds = updateFinancialInfosRequests.map(
        (request) => request.adminId,
      );

      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      const admins = await firstValueFrom(
        this.authService.findAdmins({ adminIds }),
      );

      // Invalidate caches after updating financial infos
      await this.cacheManager.del('/auth/find-all');
      await this.cacheManager.del(`/auth/users/${user.clerkId}`);

      for (const admin of admins.admins) {
        await this.cacheManager.del(`/auth/users/${admin.clerkId}`);
      }

      const idempotencyKeys = updateFinancialInfosRequests.map(
        (request) => request.idempotencyKey,
      );

      await firstValueFrom(
        this.authService.removeIdempotencyRecordsByKeys({
          keys: idempotencyKeys,
        }),
      );

      this.eventsHandlerClient.emit('update-financial-infos-failed', {
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
      const payload = await this.cacheManager.get(data.sagaStateId!);
      const { userId, total, orderItems } =
        payload as HandleCheckoutSessionCompletedPayload;

      const order = await firstValueFrom(
        this.ordersService.create({
          userId,
          total,
          orderItems,
        }),
      );

      await this.cacheManager.set(data.sagaStateId!, {
        ...(payload as HandleCheckoutSessionCompletedPayload),
        orderId: order.id,
      });

      this.eventsHandlerClient.emit('update-purchases-and-sales-counts', {
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
  // Undo Update Financial Infos
  // Undo Update Quantities
  async handleCreateOrderFailed(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
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

  async handleUpdatePurchasesAndSalesCounts(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
      const { userId, updateFinancialInfosRequests } =
        payload as HandleCheckoutSessionCompletedPayload;

      const adminIds = updateFinancialInfosRequests.map(
        (request) => request.adminId,
      );

      await firstValueFrom(
        this.authService.updatePurchasesAndSalesCounts({
          userId,
          adminIds,
        }),
      );

      this.eventsHandlerClient.emit('notify-buyer', {
        sagaStateId: data.sagaStateId,
      });
    } catch (error) {
      this.handleError(error, 'update purchases and sales counts');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('update-purchases-and-sales-count', {
          sagaStateId: data.sagaStateId,
          retryCount: retryCount + 1,
        });
      } else {
        this.eventsHandlerClient.emit(
          'update-purchases-and-sales-count-failed',
          {
            sagaStateId: data.sagaStateId,
          },
        );
      }
    }
  }

  // Undo Create Order
  // Undo Clear Cart
  // Undo Update Financial Infos
  // Undo Update Quantities
  async handleUpdatePurchasesAndSalesCountsFailed(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
      const { orderId } = payload as HandleCheckoutSessionCompletedPayload;

      await firstValueFrom(
        this.ordersService.remove({
          id: orderId,
        }),
      );

      this.eventsHandlerClient.emit('create-order-failed', {
        sagaStateId: data.sagaStateId,
      });
    } catch (error) {
      this.handleError(error, 'compensate update purchases and sales counts');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit(
          'update-purchases-and-sales-count-failed',
          {
            sagaStateId: data.sagaStateId,
            retryCount: retryCount + 1,
          },
        );
      }
    }
  }

  async handleNotifyBuyer(data: SagaFlowProps) {
    try {
      const payload = await this.cacheManager.get(data.sagaStateId!);
      const { userId, orderId } =
        payload as HandleCheckoutSessionCompletedPayload;
      const user = await firstValueFrom(
        this.authService.findUser({ id: userId }),
      );

      await this.nodemailerService.notifyBuyer(
        user.email,
        user.name,
        user.name.split(' ')[0],
        orderId,
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
      const payload = await this.cacheManager.get(data.sagaStateId!);
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

          await this.nodemailerService.notifyAdmin(
            admin.email,
            admin.name,
            admin.name.split(' ')[0],
            buyer.name,
            payload.orderItems,
          );
        }),
      );

      await this.cacheManager.del(data.sagaStateId!);
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

  // Clear user's cart items
  // Clear cart items linked to user's products
  // Deletes or anonymizes products depending on whether they’re still linked to other order items
  // Delete user (refresh token will be deleted via cascade)
  // Delete orphaned products (products that are linked to anonymous user but not linked to any order items)
  async handleUserDeleted(data: { clerkId: string; retryCount?: number }) {
    try {
      const user = await firstValueFrom(
        this.authService.findUserByClerkId({ clerkId: data.clerkId }),
      );

      if (Object.keys(user).length === 0) {
        this.logger.warn(
          `User with clerkId ${data.clerkId} not found. Skipping delete...`,
        );

        return;
      }

      this.eventsHandlerClient.emit('clear-cart', {
        userId: user.id,
      });
    } catch (error) {
      this.handleError(error, 'user deleted');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('user-deleted', {
          clerkId: data.clerkId,
          retryCount: retryCount + 1,
        });
      }

      // Give up after retries
    }
  }

  async handleRemoveProductsCartItems(data: SagaFlowProps) {
    try {
      const response = await firstValueFrom(
        this.productsService.findAllByAdminId({
          adminId: data.userId!,
        }),
      );

      const products = response.products || [];
      const productIds = products.map((product) => product.id);

      if (productIds.length > 0) {
        await firstValueFrom(
          this.cartItemsService.removeByProductIds({
            productIds,
          }),
        );
      }

      this.eventsHandlerClient.emit('remove-or-anonymize-products', {
        userId: data.userId,
      });
    } catch (error) {
      this.handleError(
        error,
        `remove products cart items for user with id ${data.userId}`,
      );

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('remove-products-cart-items', {
          userId: data.userId,
          retryCount: retryCount + 1,
        });
      }
    }
  }

  async handleRemoveOrAnonymizeProducts(data: SagaFlowProps) {
    try {
      const response = await firstValueFrom(
        this.productsService.findAllByAdminId({
          adminId: data.userId!,
        }),
      );

      const products = response.products || [];

      if (products.length === 0) {
        this.eventsHandlerClient.emit('remove-user', { userId: data.userId });

        return;
      }

      const productIds = products.map((product) => product.id);

      const findReferencedProductIdsResponse = await firstValueFrom(
        this.ordersService.findReferencedProductIds({
          productIds,
        }),
      );

      const referencedProductIds =
        findReferencedProductIdsResponse.productIds || [];

      // Remove products that are not linked to other order items
      const toBeDeletedProductIds = productIds.filter(
        (id) => !referencedProductIds.includes(id),
      );

      if (toBeDeletedProductIds.length > 0) {
        await firstValueFrom(
          this.productsService.removeByIds({
            ids: toBeDeletedProductIds,
          }),
        );
      }

      if (referencedProductIds.length > 0) {
        const anonymousUser = await firstValueFrom(
          this.authService.findOrCreateAnonymousUser({}),
        );

        await firstValueFrom(
          this.productsService.updateAdminIdByIds({
            ids: referencedProductIds,
            newAdminId: anonymousUser.id,
          }),
        );
      }

      await this.cacheManager.del('/products');

      this.eventsHandlerClient.emit('remove-user', {
        userId: data.userId,
      });
    } catch (error) {
      this.handleError(
        error,
        `remove or anonymize products for user with id ${data.userId}`,
      );

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('remove-or-anonymize-products', {
          userId: data.userId,
          retryCount: retryCount + 1,
        });
      }
    }
  }

  async handleRemoveUser(data: SagaFlowProps) {
    try {
      const user = await firstValueFrom(
        this.authService.findUser({ id: data.userId! }),
      );

      await firstValueFrom(
        this.authService.remove({
          id: data.userId!,
        }),
      );

      await this.cacheManager.del('/auth/find-all');
      await this.cacheManager.del(`/auth/users/${user.clerkId}`);

      this.eventsHandlerClient.emit('remove-orphaned-products', {
        retryCount: 0,
      });
    } catch (error) {
      this.handleError(error, `remove user with id ${data.userId}`);

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('remove-user', {
          userId: data.userId,
          retryCount: retryCount + 1,
        });
      }
    }
  }

  async handleRemoveOrphanedProducts(data: SagaFlowProps) {
    try {
      const anonymousUser = await firstValueFrom(
        this.authService.findOrCreateAnonymousUser({}),
      );

      const response = await firstValueFrom(
        this.productsService.findAllByAdminId({
          adminId: anonymousUser.id,
        }),
      );

      const products = response.products || [];

      if (products.length === 0) return;

      const productIds = products.map((product) => product.id);

      const findReferencedProductIdsResponse = await firstValueFrom(
        this.ordersService.findReferencedProductIds({
          productIds,
        }),
      );

      const referencedProductIds =
        findReferencedProductIdsResponse.productIds || [];

      // Remove products that are not linked to other order items
      const toBeDeletedProductIds = productIds.filter(
        (id) => !referencedProductIds.includes(id),
      );

      if (toBeDeletedProductIds.length > 0) {
        await firstValueFrom(
          this.productsService.removeByIds({
            ids: toBeDeletedProductIds,
          }),
        );
      }

      await this.cacheManager.del('/products');
    } catch (error) {
      this.handleError(error, 'remove orphaned products');

      await new Promise((res) => setTimeout(res, 2000)); // 2 secs delay

      const retryCount = data.retryCount || 0;

      if (retryCount < 2) {
        this.eventsHandlerClient.emit('remove-orphaned-products', {
          retryCount: retryCount + 1,
        });
      }
    }
  }
}
