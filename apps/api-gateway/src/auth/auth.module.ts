import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PACKAGE_NAME } from '@app/protos';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: AUTH_PACKAGE_NAME,
          protoPath: join(__dirname, '../../libs/protos/auth.proto'),
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, RefreshJwtStrategy],
})
export class AuthModule {}
