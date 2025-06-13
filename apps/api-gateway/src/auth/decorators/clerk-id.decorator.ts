import { User } from '@app/protos/generated/auth';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ClerkId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();

    return request.user.clerkId;
  },
);
