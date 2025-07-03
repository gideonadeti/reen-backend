import Stripe from 'stripe';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { clerkClient } from '@clerk/express';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  RawBodyRequest,
} from '@nestjs/common';

import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
} from '@app/protos/generated/auth';

@Injectable()
export class WebhooksService implements OnModuleInit {
  constructor(
    @Inject('EVENTS_HANDLER_SERVICE') private eventsHandlerClient: ClientProxy,
    @Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  private logger = new Logger(WebhooksService.name);
  private authService: AuthServiceClient;

  onModuleInit() {
    this.authService = this.authClient.getService(AUTH_SERVICE_NAME);
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  handleCheckoutSessionCompleted(req: RawBodyRequest<Request>, sig: string) {
    const webhookSecret = this.configService.get(
      'STRIPE_WEBHOOK_SIGNING_SECRET',
    ) as string;
    const stripeSecretKey = this.configService.get(
      'STRIPE_SECRET_KEY',
    ) as string;
    const stripe = new Stripe(stripeSecretKey);

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret,
      );

      this.logger.log(`Stripe event received: ${event.type}`);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        this.eventsHandlerClient.emit('checkout-session-completed', session);
      }

      return { received: true };
    } catch (error) {
      this.handleError(error, 'handle checkout session completed');
    }
  }

  handleUserDeleted(clerkId: string) {
    return {
      clerkId,
    };
  }

  async handleUserUpdated(clerkId: string) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const user = await firstValueFrom(
        this.authService.findUserByClerkId({ clerkId }),
      );

      if (Object.keys(user).length === 0) {
        this.logger.warn(
          `User with clerkId ${clerkId} not found. Skipping update...`,
        );

        return;
      }

      const name = clerkUser.fullName as string;
      const email = clerkUser.primaryEmailAddress!.emailAddress;

      await firstValueFrom(
        this.authService.updateNameAndEmail({ id: user.id, name, email }),
      );

      // Invalidate users and user caches after user update
      await this.cacheManager.del('/auth/find-all');
      await this.cacheManager.del(`/auth/users/${clerkId}`);

      return {
        received: true,
      };
    } catch (error) {
      this.handleError(error, 'handle user updated');
    }
  }
}
