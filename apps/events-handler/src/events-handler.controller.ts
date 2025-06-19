import Stripe from 'stripe';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { EventsHandlerService } from './events-handler.service';

@Controller()
export class EventsHandlerController {
  constructor(private readonly eventsHandlerService: EventsHandlerService) {}

  @EventPattern('checkout-session-completed')
  handleCheckoutSessionCompleted(@Payload() data: Stripe.Checkout.Session) {
    return this.eventsHandlerService.handleCheckoutSessionCompleted(data);
  }

  @EventPattern('update-quantities')
  handleUpdateQuantities(
    @Payload() data: { sagaStateId: string; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleUpdateQuantities(data);
  }

  @EventPattern('update-balances')
  handleUpdateBalances(
    @Payload() data: { sagaStateId: string; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleUpdateBalances(data);
  }

  @EventPattern('clear-cart')
  handleClearCart(
    @Payload() data: { sagaStateId: string; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleClearCart(data);
  }

  @EventPattern('create-order')
  handleCreateOrder(
    @Payload() data: { sagaStateId: string; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleCreateOrder(data);
  }

  @EventPattern('notify-buyer')
  handleNotifyBuyer(
    @Payload() data: { sagaStateId: string; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleNotifyBuyer(data);
  }

  @EventPattern('notify-admins')
  handleNotifyAdmins(
    @Payload() data: { sagaStateId: string; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleNotifyAdmins(data);
  }
}
