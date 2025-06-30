import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';

import { OrderItem } from '@app/protos/generated/orders';
import { Product } from '@app/protos/generated/products';

@Injectable()
export class MailersendService {
  private mailersend: MailerSend;
  private sentFrom: Sender;

  constructor(private readonly configService: ConfigService) {
    this.mailersend = new MailerSend({
      apiKey: configService.get('MAILERSEND_API_KEY') as string,
    });

    this.sentFrom = new Sender(
      'test-yxj6lj91dk14do2r.mlsender.net',
      'Gideon Adeti',
    );
  }

  private formatMoney(amount: number) {
    return (
      '$' +
      amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  async notifyBuyer(to: string, fullName: string, firstName: string) {
    const recipients = [new Recipient(to, fullName)];
    const subject = 'You made a purchase!';
    const html = `
        <p>Hi ${firstName},</p>
        <p>Thanks for your purchase. Your order has been created and is now being delivered.</p>
        <p>If you have any questions, feel free to reach out.</p>
        <p style="margin-top: 1.5rem;">— Gideon Adeti, CEO</p>`;

    const emailParams = new EmailParams()
      .setFrom(this.sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html);

    await this.mailersend.email.send(emailParams);
  }

  async notifyAdmin(
    to: string,
    fullName: string,
    firstName: string,
    buyerName: string,
    orderItems: (OrderItem & { product: Product })[],
  ) {
    const recipients = [new Recipient(to, fullName)];
    const subject = 'You made a sale!';
    const total = orderItems.reduce((sum, item) => sum + item.price, 0);
    const tableRows = orderItems
      .map(
        (item) => `
          <tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>${this.formatMoney(item.price / item.quantity)}</td>
            <td>${this.formatMoney(item.price)}</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <p>Hi ${firstName},</p>
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
          ${tableRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>${this.formatMoney(total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <p>If you have any questions, feel free to reach out.</p>
      <p style="margin-top: 1.5rem;">— Gideon Adeti, CEO</p>`;

    const emailParams = new EmailParams()
      .setFrom(this.sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html);

    await this.mailersend.email.send(emailParams);
  }
}
