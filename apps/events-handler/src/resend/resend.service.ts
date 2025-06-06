import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

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
}
