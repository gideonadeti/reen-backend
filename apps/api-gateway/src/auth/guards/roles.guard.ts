import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { clerkClient, getAuth } from '@clerk/express';

import { UserRole } from '@app/protos/generated/auth';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private logger = new Logger(RolesGuard.name);

  async canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const { userId } = getAuth(request);

    try {
      const user = await clerkClient.users.getUser(userId!);
      const userRole = user.publicMetadata.role as UserRole;

      return requiredRoles.includes(userRole);
    } catch (error) {
      this.logger.error('Failed to get user', (error as Error).stack);

      return false;
    }
  }
}
