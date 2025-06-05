import { Controller } from '@nestjs/common';
import { EventsHandlerService } from './events-handler.service';

@Controller()
export class EventsHandlerController {
  constructor(private readonly eventsHandlerService: EventsHandlerService) {}
}
