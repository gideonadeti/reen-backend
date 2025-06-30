import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';

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
}
