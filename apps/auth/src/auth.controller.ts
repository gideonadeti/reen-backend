import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import {
  AUTH_SERVICE_NAME,
  FindAdminsRequest,
  FindUserByClerkIdRequest,
  FindUserRequest,
  RefreshTokenRequest,
  SignOutRequest,
  SignUpRequest,
  UpdateUserRoleRequest,
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

  @GrpcMethod(AUTH_SERVICE_NAME)
  findUser(data: FindUserRequest) {
    return this.authService.findUser(data.id);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  findAdmins(data: FindAdminsRequest) {
    return this.authService.findAdmins(data.adminIds);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  updateUserRole(data: UpdateUserRoleRequest) {
    return this.authService.updateUserRole(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  findUserByClerkId(data: FindUserByClerkIdRequest) {
    return this.authService.findUserByClerkId(data.clerkId);
  }
}
