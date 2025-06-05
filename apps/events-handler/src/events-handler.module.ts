import { Module } from '@nestjs/common';
import { EventsHandlerController } from './events-handler.controller';
import { EventsHandlerService } from './events-handler.service';

@Module({
  imports: [],
  controllers: [EventsHandlerController],
  providers: [EventsHandlerService],
})
export class EventsHandlerModule {}
