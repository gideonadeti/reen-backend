import { Product } from '@app/protos/generated/products';

export interface AdminNotificationPayload {
  adminId: string;
  userId: string;
  orderItems: {
    product: Product;
    productId: string;
    quantity: number;
    price: number;
  }[];
}
