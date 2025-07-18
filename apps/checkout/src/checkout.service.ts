import Stripe from 'stripe';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

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
export class CheckoutService {
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
    private configService: ConfigService,
  ) {}

  private cartItemsService: CartItemsServiceClient;
  private productsService: ProductsServiceClient;
  private logger = new Logger(CheckoutService.name);

  onModuleInit() {
    this.cartItemsService = this.cartItemsClient.getService(
      CART_ITEMS_SERVICE_NAME,
    );
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

  async checkout(userId: string) {
    try {
      const findAllResponse = await firstValueFrom(
        this.cartItemsService.findAll({ userId }),
      );
      const cartItems = findAllResponse.cartItems || [];

      if (cartItems.length === 0) {
        throw new BadRequestException(
          'Cart is empty. Cannot proceed to checkout.',
        );
      }

      const productIds = cartItems.map((cartItem) => cartItem.productId);
      const findByIdsResponse = await firstValueFrom(
        this.productsService.findByIds({
          ids: productIds,
        }),
      );
      const products = findByIdsResponse.products || [];
      const productMap = new Map(products.map((p) => [p.id, p]));
      const frontendBaseUrl = this.configService.get(
        'FRONTEND_BASE_URL',
      ) as string;
      const stripeSecretKey = this.configService.get(
        'STRIPE_SECRET_KEY',
      ) as string;
      const stripe = new Stripe(stripeSecretKey);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: cartItems.map((item) => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: productMap.get(item.productId)!.name,
            },
            unit_amount: Number(productMap.get(item.productId)?.price) * 100,
          },
          quantity: item.quantity,
        })),
        metadata: {
          userId,
        },
        payment_method_types: ['card'],
        success_url: `${frontendBaseUrl}/checkout?success=true`,
        cancel_url: `${frontendBaseUrl}/checkout?canceled=true`,
      });

      return {
        stripeSessionUrl: session.url,
      };
    } catch (error) {
      this.handleError(error, 'checkout');
    }
  }
}
