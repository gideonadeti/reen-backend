import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { clerkMiddleware } from '@clerk/express';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

import { ApiGatewayModule } from './api-gateway.module';

const bootstrap = async () => {
  const app = await NestFactory.create(ApiGatewayModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const frontendBaseUrl = configService.get('FRONTEND_BASE_URL') as string;

  app.enableCors({
    origin: [frontendBaseUrl],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(cookieParser());
  app.use(clerkMiddleware());
  app.use('/webhooks/clerk', express.raw({ type: 'application/json' }));

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Gateway for REEN backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const options: SwaggerDocumentOptions = {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
  };
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, options);

  SwaggerModule.setup('/api-gateway/documentation', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
};

void bootstrap();
