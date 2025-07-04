import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { AuthService } from './auth.service';
import {
  AUTH_SERVICE_NAME,
  ChargeFeeRequest,
  Empty,
  FindAdminsRequest,
  FindByIdsRequest,
  FindUserByClerkIdRequest,
  FindUserRequest,
  RefreshTokenRequest,
  RemoveIdempotencyRecordsByKeysRequest,
  RemoveRequest,
  SignOutRequest,
  SignUpRequest,
  UpdateFinancialInfosRequest,
  UpdateNameAndEmailRequest,
  UpdatePurchasesAndSalesCountsRequest,
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

  @GrpcMethod(AUTH_SERVICE_NAME)
  findByIds(data: FindByIdsRequest) {
    return this.authService.findByIds(data.ids);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  updateFinancialInfos(data: UpdateFinancialInfosRequest) {
    return this.authService.updateFinancialInfos(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  removeIdempotencyRecordsByKeys(data: RemoveIdempotencyRecordsByKeysRequest) {
    return this.authService.removeIdempotencyRecordsByKeys(data.keys);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  findAll(data: Empty) {
    return this.authService.findAll(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  updatePurchasesAndSalesCounts(data: UpdatePurchasesAndSalesCountsRequest) {
    return this.authService.updatePurchasesAndSalesCounts(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  undoUpdateFinancialInfos(data: UpdateFinancialInfosRequest) {
    return this.authService.undoUpdateFinancialInfos(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  chargeFee(data: ChargeFeeRequest) {
    return this.authService.chargeFee(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  undoChargeFee(data: ChargeFeeRequest) {
    return this.authService.undoChargeFee(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  findOrCreateAnonymousUser(data: Empty) {
    return this.authService.findOrCreateAnonymousUser(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  updateNameAndEmail(data: UpdateNameAndEmailRequest) {
    return this.authService.updateNameAndEmail(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME)
  remove(data: RemoveRequest) {
    return this.authService.remove(data.id);
  }
}
