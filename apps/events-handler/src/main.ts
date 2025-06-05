import { NestFactory } from '@nestjs/core';
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

import { EventsHandlerModule } from './events-handler.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    EventsHandlerModule,
    {
      useFactory: (configService: ConfigService) => ({
        transport: Transport.RMQ,
        options: {
          urls: [configService.get('MESSAGE_BROKER_URL') as string],
          queue: 'events-handler',
        },
      }),
      inject: [ConfigService],
    },
  );

  await app.listen();
}

void bootstrap();
