import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerSend, Sender } from 'mailersend';

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
}
