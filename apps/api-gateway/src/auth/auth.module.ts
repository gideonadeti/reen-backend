import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PACKAGE_NAME } from '@app/protos/generated/auth';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: AUTH_PACKAGE_NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE_NAME,
            protoPath: join(__dirname, '../../libs/protos/auth.proto'),
            url: configService.get('AUTH_SERVICE_URL') as string,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, RefreshJwtStrategy, JwtStrategy],
})
export class AuthModule {}
