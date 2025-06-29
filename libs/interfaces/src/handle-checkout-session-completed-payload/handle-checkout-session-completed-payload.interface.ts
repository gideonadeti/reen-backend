import { CartItem } from '@app/protos/generated/cart-items';
import { OrderItem } from '@app/protos/generated/orders';
import { UpdateFinancialInfosRequest } from '@app/protos/generated/auth';
import { AdminNotificationPayload } from '../admin-notification-payload/admin-notification-payload.interface';

export interface HandleCheckoutSessionCompletedPayload {
  cartItems: CartItem[];
  userId: string;
  total: number;
  orderItems: OrderItem[];
  updateFinancialInfosRequests: UpdateFinancialInfosRequest[];
  adminNotificationPayloads: AdminNotificationPayload[];
  balanceIds: string[];
}
