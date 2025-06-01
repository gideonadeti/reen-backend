import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import { AUTH_SERVICE_NAME, SignUpRequest } from '@app/protos';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod(AUTH_SERVICE_NAME)
  signUp(data: SignUpRequest) {
    return this.authService.signUp(data);
  }
}
