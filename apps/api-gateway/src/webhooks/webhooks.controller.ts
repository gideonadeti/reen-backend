import { Request, Response } from 'express';
import { verifyWebhook } from '@clerk/express/webhooks';
import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';

import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  private logger = new Logger(WebhooksController.name);

  @Post('stripe')
  handleCheckoutSessionCompleted(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.webhooksService.handleCheckoutSessionCompleted(req, sig);
  }

  @Post('clerk')
  async handleClerkWebhook(@Req() req: Request) {
    try {
      const event = await verifyWebhook(req);
      const clerkId = event.data?.id;

      if (!clerkId) {
        throw new BadRequestException('Clerk id not found');
      }

      switch (event.type) {
        case 'user.deleted':
          return this.webhooksService.handleUserDeleted(clerkId);

        case 'user.updated':
          return this.webhooksService.handleUserUpdated(clerkId);

        default:
          this.logger.warn(`Unhandled event: ${event.type}`);

          throw new BadRequestException('Invalid event type');
      }
    } catch (error) {
      this.logger.error('Error verifying webhook', (error as Error).stack);

      throw new BadRequestException('Webhook verification failed');
    }
  }
}
