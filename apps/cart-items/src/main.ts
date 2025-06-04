import { NestFactory } from '@nestjs/core';
import { CartItemsModule } from './cart-items.module';

async function bootstrap() {
  const app = await NestFactory.create(CartItemsModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
