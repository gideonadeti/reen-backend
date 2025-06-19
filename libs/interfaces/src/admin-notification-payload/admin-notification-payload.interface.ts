import { Product } from '@app/protos/generated/products';
import { OrderItem } from '@app/protos/generated/orders';

export interface AdminNotificationPayload {
  adminId: string;
  userId: string;
  orderItems: (OrderItem & { product: Product })[];
}
