import { NestFactory } from '@nestjs/core';
import { CheckoutModule } from './checkout.module';

async function bootstrap() {
  const app = await NestFactory.create(CheckoutModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
