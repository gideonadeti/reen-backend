import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventsHandlerController } from './events-handler.controller';
import { EventsHandlerService } from './events-handler.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/events-handler/.env',
    }),
  ],
  controllers: [EventsHandlerController],
  providers: [EventsHandlerService],
})
export class EventsHandlerModule {}
