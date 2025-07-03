import Stripe from 'stripe';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { clerkClient } from '@clerk/express';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject('EVENTS_HANDLER_SERVICE') private eventsHandlerClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private logger = new Logger(WebhooksService.name);

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
    const clerkUser = await clerkClient.users.getUser(clerkId);

    return {
      clerkUser,
    };
  }
}
