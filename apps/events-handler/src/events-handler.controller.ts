import { Controller, Get } from '@nestjs/common';
import { EventsHandlerService } from './events-handler.service';

@Controller()
export class EventsHandlerController {
  constructor(private readonly eventsHandlerService: EventsHandlerService) {}

  @Get()
  getHello(): string {
    return this.eventsHandlerService.getHello();
  }
}
