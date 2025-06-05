import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class WebhooksService {
  constructor(
    @Inject('EVENTS_HANDLER_SERVICE') private eventsHandlerClient: ClientProxy,
  ) {}
}
