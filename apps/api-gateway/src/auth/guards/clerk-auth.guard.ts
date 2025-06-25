import { ClientGrpc } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { clerkClient, getAuth } from '@clerk/express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
  User,
} from '@app/protos/generated/auth';

@Injectable()
export class ClerkAuthGuard implements CanActivate, OnModuleInit {
  constructor(
    @Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private authService: AuthServiceClient;
  private logger = new Logger(ClerkAuthGuard.name);

  onModuleInit() {
    this.authService = this.authClient.getService(AUTH_SERVICE_NAME);
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const { userId } = getAuth(request);

    if (userId !== null) {
      try {
        await this.attachUserToRequest(userId, request);
      } catch (error) {
        this.logger.error('Failed to attach user:', (error as Error).stack);

        return false;
      }
    }

    return userId !== null;
  }

  async attachUserToRequest(clerkId: string, req: Request) {
    let user = await firstValueFrom(
      this.authService.findUserByClerkId({ clerkId }),
    );

    if (Object.keys(user).length === 0) {
      const clerkUser = await clerkClient.users.getUser(clerkId);

      const signUpResponse = await firstValueFrom(
        this.authService.signUp({
          name: clerkUser.fullName as string,
          email: clerkUser.primaryEmailAddress!.emailAddress,
          clerkId,
        }),
      );

      user = signUpResponse.user as User;

      await this.cacheManager.del('/auth/find-all');
    }

    req['user'] = user;
  }
}
