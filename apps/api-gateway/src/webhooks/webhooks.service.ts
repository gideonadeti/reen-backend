import Stripe from 'stripe';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { clerkClient } from '@clerk/express';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { verifyWebhook } from '@clerk/express/webhooks';
import {
  BadRequestException,
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

  private async handleUserUpdated(clerkId: string) {
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
  }

  private handleUserDeleted(clerkId: string) {
    this.eventsHandlerClient.emit('user-deleted', { clerkId });

    return {
      received: true,
    };
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

        this.eventsHandlerClient.emit('checkout-session-completed', {
          session,
        });
      }

      return { received: true };
    } catch (error) {
      this.handleError(error, 'handle checkout session completed');
    }
  }

  async handleClerkWebhook(req: Request) {
    try {
      const event = await verifyWebhook(req);
      const clerkId = event.data?.id;

      if (!clerkId) {
        throw new BadRequestException('Clerk id not found');
      }

      this.logger.log(`Clerk event received: ${event.type}`);

      switch (event.type) {
        case 'user.deleted':
          return this.handleUserDeleted(clerkId);

        case 'user.updated':
          return this.handleUserUpdated(clerkId);

        default:
          throw new BadRequestException('Invalid event type');
      }
    } catch (error) {
      this.handleError(error, 'handle clerk webhook');
    }
  }
}
