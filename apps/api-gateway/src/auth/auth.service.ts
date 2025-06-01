import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';

import { SignUpDto } from './dtos/sign-up.dto';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
} from '@app/protos';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(@Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc) {}

  private authService: AuthServiceClient;

  onModuleInit() {
    this.authService =
      this.authClient.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  signUp(signUpDto: SignUpDto, res: Response) {
    res.json(signUpDto);
  }
}
