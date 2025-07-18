import Stripe from 'stripe';
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { EventsHandlerService } from './events-handler.service';
import { SagaFlowProps } from '@app/interfaces/saga-flow-props/saga-flow-props.interface';

@Controller()
export class EventsHandlerController {
  constructor(private readonly eventsHandlerService: EventsHandlerService) {}

  @EventPattern('checkout-session-completed')
  handleCheckoutSessionCompleted(
    @Payload() data: { session: Stripe.Checkout.Session; retryCount?: number },
  ) {
    return this.eventsHandlerService.handleCheckoutSessionCompleted(data);
  }

  @EventPattern('update-quantities')
  handleUpdateQuantities(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdateQuantities(data);
  }

  @EventPattern('update-financial-infos')
  handleUpdateFinancialInfos(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdateFinancialInfos(data);
  }

  @EventPattern('update-financial-infos-failed')
  handleUpdateFinancialInfosFailed(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdateFinancialInfosFailed(data);
  }

  @EventPattern('clear-cart')
  handleClearCart(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleClearCart(data);
  }

  @EventPattern('clear-cart-failed')
  handleClearCartFailed(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleClearCartFailed(data);
  }

  @EventPattern('create-order')
  handleCreateOrder(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleCreateOrder(data);
  }

  @EventPattern('create-order-failed')
  handleCreateOrderFailed(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleCreateOrderFailed(data);
  }

  @EventPattern('update-purchases-and-sales-counts')
  handleUpdatePurchasesAndSalesCounts(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdatePurchasesAndSalesCounts(data);
  }

  @EventPattern('update-purchases-and-sales-counts-failed')
  handleUpdatePurchasesAndSalesCountsFailed(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleUpdatePurchasesAndSalesCountsFailed(
      data,
    );
  }

  @EventPattern('notify-buyer')
  handleNotifyBuyer(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleNotifyBuyer(data);
  }

  @EventPattern('notify-admins')
  handleNotifyAdmins(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleNotifyAdmins(data);
  }

  @EventPattern('user-deleted')
  handleUserDeleted(@Payload() data: { clerkId: string; retryCount?: number }) {
    return this.eventsHandlerService.handleUserDeleted(data);
  }

  @EventPattern('remove-products-cart-items')
  handleRemoveProductsCartItems(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleRemoveProductsCartItems(data);
  }

  @EventPattern('remove-or-anonymize-products')
  handleRemoveOrAnonymizeProducts(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleRemoveOrAnonymizeProducts(data);
  }

  @EventPattern('remove-user')
  handleRemoveUser(@Payload() data: SagaFlowProps) {
    return this.eventsHandlerService.handleRemoveUser(data);
  }
}
