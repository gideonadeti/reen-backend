import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { OrderItem } from '@app/protos/generated/orders';
import { Product } from '@app/protos/generated/products';

@Injectable()
export class ResendService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(configService.get('RESEND_API_KEY') as string);
  }

  async sendOrderConfirmation(to: string, firstName: string) {
    await this.resend.emails.send({
      from: 'Gideon Adeti <onboarding@resend.dev>',
      to,
      subject: 'Thanks for your purchase',
      html: `
        <p>Hi ${firstName},</p>
        <p>Thanks for your purchase. Your order has been made and is now being delivered.</p>
        <p>If you have any questions, feel free to reach out.</p>
        <p style="margin-top: 1.5rem;">— Gideon Adeti, CEO</p>
      `,
    });
  }

  async sendAdminNotification(
    to: string,
    adminFirstName: string,
    buyerName: string,
    orderItems: (OrderItem & { product: Product })[],
  ) {
    const total = orderItems.reduce((sum, item) => sum + item.price, 0);

    const itemsHtml = orderItems
      .map(
        (item) => `
          <tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>$${(item.price / item.quantity).toFixed(2)}</td>
            <td>$${item.price.toFixed(2)}</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <p>Hi ${adminFirstName},</p>
      <p>${buyerName} just purchased the following items from you:</p>

      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price Each</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>$${total.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <p>Your account balance has been updated accordingly. You can view your latest balance in your dashboard.</p>
      <p style="margin-top: 1.5rem;">— Gideon Adeti, CEO</p>
    `;

    await this.resend.emails.send({
      from: 'Gideon Adeti <onboarding@resend.dev>',
      to,
      subject: 'You made a sale!',
      html,
    });
  }
}
