import Stripe from 'stripe';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { EventsHandlerService } from './events-handler.service';
import { AdminNotificationPayload } from '@app/interfaces/admin-notification-payload/admin-notification-payload.interface';

@Controller()
export class EventsHandlerController {
  constructor(private readonly eventsHandlerService: EventsHandlerService) {}

  @EventPattern('checkout-session-completed')
  handleCheckoutSessionCompleted(@Payload() data: Stripe.Checkout.Session) {
    return this.eventsHandlerService.handleCheckoutSessionCompleted(data);
  }

  @EventPattern('send-order-confirmation')
  handleSendOrderConfirmation(@Payload() data: string) {
    return this.eventsHandlerService.handleSendOrderConfirmation(data);
  }

  @EventPattern('send-admin-notifications')
  handleSendAdminNotifications(@Payload() data: AdminNotificationPayload[]) {
    return this.eventsHandlerService.handleSendAdminNotifications(data);
  }
}
