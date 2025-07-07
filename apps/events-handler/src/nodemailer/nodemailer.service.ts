import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OrderItem } from '@app/protos/generated/orders';
import { Product } from '@app/protos/generated/products';

@Injectable()
export class NodemailerService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'gideonadeti0@gmail.com',
        pass: this.configService.get('GOOGLE_APP_PASSWORD') as string,
      },
    });
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

  async notifyBuyer(
    to: string,
    fullName: string,
    firstName: string,
    orderId: string,
  ) {
    const subject = 'You made a purchase!';
    const baseUrl = this.configService.get('FRONTEND_BASE_URL') as string;
    const orderUrl = `${baseUrl}/orders/${orderId}`;
    const ordersPageUrl = `${baseUrl}/orders`;

    const html = `
      <p>Hi ${firstName},</p>
      <p>Thanks for your purchase. Your order has been successfully created.</p>
      <p>
        You can view this order <a href="${orderUrl}">here</a> or by going to the
        <a href="${ordersPageUrl}">orders page</a> on REEN.
      </p>
      <p>If you have any questions, feel free to reach out.</p>
      <p style="margin-top: 1.5rem;">Tschüss und auf Wiedersehen!<br>— Gideon Adeti, CEO</p>
    `;

    await this.sendEmail(to, fullName, subject, html);
  }

  async notifyAdmin(
    to: string,
    fullName: string,
    firstName: string,
    buyerName: string,
    orderItems: (OrderItem & { product: Product })[],
  ) {
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
      <p style="margin-top: 1.5rem;">Tschüss und auf Wiedersehen!<br>— Gideon Adeti, CEO</p>
    `;

    await this.sendEmail(to, fullName, subject, html);
  }

  private async sendEmail(
    to: string,
    name: string,
    subject: string,
    html: string,
  ) {
    await this.transporter.sendMail({
      from: `"Gideon Adeti" <gideonadeti0@gmail.com>`,
      to: `${name} <${to}>`,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, ''), // fallback plain text
    });
  }
}
