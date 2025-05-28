import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

import { ApiGatewayModule } from './api-gateway.module';

const bootstrap = async () => {
  const app = await NestFactory.create(ApiGatewayModule);
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Gateway for REEN backend')
    .setVersion('1.0.0')
    .build();
  const options: SwaggerDocumentOptions = {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
  };
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, options);

  SwaggerModule.setup('/api-gateway/documentation', app, documentFactory);

  await app.listen(process.env.port ?? 3000);
};

void bootstrap();
