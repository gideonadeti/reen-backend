import Stripe from 'stripe';
import { ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

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
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CheckoutService implements OnModuleInit {
  constructor(
    @Inject(CART_ITEMS_PACKAGE_NAME) private cartItemsClient: ClientGrpc,
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
    private configService: ConfigService,
  ) {}

  private logger = new Logger(CheckoutService.name);
  private cartItemsService: CartItemsServiceClient;
  private productsService: ProductsServiceClient;

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

    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new InternalServerErrorException(`Failed to ${action}`);
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
