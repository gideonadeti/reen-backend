import Stripe from 'stripe';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { EventsHandlerService } from './events-handler.service';
import { SagaFlowProps } from '@app/interfaces/saga-flow-props/saga-flow-props.interface';

@Controller()
export class EventsHandlerController {
  constructor(private readonly eventsHandlerService: EventsHandlerService) {}

  @EventPattern('checkout-session-completed')
  handleCheckoutSessionCompleted(@Payload() data: Stripe.Checkout.Session) {
    return this.eventsHandlerService.handleCheckoutSessionCompleted(data);
  }

  @EventPattern('update-quantities')
  handleUpdateQuantities(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdateQuantities(data);
  }

  @EventPattern('update-balances')
  handleUpdateBalances(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdateBalances(data);
  }

  @EventPattern('clear-cart')
  handleClearCart(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleClearCart(data);
  }

  @EventPattern('create-order')
  handleCreateOrder(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleCreateOrder(data);
  }

  @EventPattern('notify-buyer')
  handleNotifyBuyer(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleNotifyBuyer(data);
  }

  @EventPattern('notify-admins')
  handleNotifyAdmins(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleNotifyAdmins(data);
  }
}
