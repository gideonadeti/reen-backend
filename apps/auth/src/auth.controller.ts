import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import {
  AUTH_SERVICE_NAME,
  RefreshTokenRequest,
  SignOutRequest,
  SignUpRequest,
  User,
  ValidateUserRequest,
} from '@app/protos/generated/auth';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod(AUTH_SERVICE_NAME)
  signUp(data: SignUpRequest) {
    return this.authService.signUp(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  validateUser(data: ValidateUserRequest) {
    return this.authService.validateUser(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  signIn(data: User) {
    return this.authService.signIn(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  refreshToken(data: RefreshTokenRequest) {
    return this.authService.refreshToken(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  signOut(data: SignOutRequest) {
    return this.authService.signOut(data);
  }
}
