import { Request, Response } from 'express';
import { verifyWebhook } from '@clerk/express/webhooks';
import {
  Controller,
  Headers,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  Res,
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
  async handleClerkWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const event = await verifyWebhook(req);
      const clerkId = event.data?.id;

      if (!clerkId) {
        this.logger.error('Missing user ID');

        return res.sendStatus(400);
      }

      switch (event.type) {
        case 'user.deleted':
          return this.webhooksService.handleUserDeleted(clerkId);
          break;
        case 'user.updated':
          await this.webhooksService.handleUserUpdated(clerkId);
          break;
        default:
          this.logger.warn(`Unhandled event: ${event.type}`);
      }

      return res.sendStatus(204);
    } catch (error) {
      this.logger.error('Error verifying webhook:', (error as Error).stack);

      return res.sendStatus(400);
    }
  }
}
