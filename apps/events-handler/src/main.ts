import { NestFactory } from '@nestjs/core';
import { EventsHandlerModule } from './events-handler.module';

async function bootstrap() {
  const app = await NestFactory.create(EventsHandlerModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
