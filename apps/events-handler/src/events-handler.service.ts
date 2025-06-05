import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsHandlerService {
  getHello(): string {
    return 'Hello World!';
  }
}
