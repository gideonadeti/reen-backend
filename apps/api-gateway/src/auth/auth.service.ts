import { CookieOptions, Request, Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { SignUpDto } from './dtos/sign-up.dto';
import { GrpcError, MicroserviceError } from '@app/interfaces';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
  User,
  UserRole,
} from '@app/protos/generated/auth';

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/auth/refresh-token',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private authService: AuthServiceClient;
  private logger = new Logger(AuthService.name);

  onModuleInit() {
    this.authService = this.authClient.getService(AUTH_SERVICE_NAME);
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as GrpcError).stack);

    const microserviceError = JSON.parse(
      (error as GrpcError).details || '{}',
    ) as MicroserviceError;

    if (
      microserviceError.name === 'PrismaClientKnownRequestError' &&
      microserviceError.code === 'P2002'
    ) {
      throw new ConflictException('Email already exists');
    }

    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  async signUp(signUpDto: SignUpDto, res: Response) {
    try {
      const response = await firstValueFrom(this.authService.signUp(signUpDto));
      const { refreshToken, accessToken, user } = response;

      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      res.status(201).json({
        accessToken,
        user: {
          ...user,
          role: UserRole[(user as User).role],
        },
      });
    } catch (error) {
      this.handleError(error, 'sign up');
    }
  }

  async validateUser(email: string, pass: string) {
    return await firstValueFrom(this.authService.validateUser({ email, pass }));
  }

  async signIn(user: User, res: Response) {
    try {
      const response = await firstValueFrom(this.authService.signIn(user));

      const { refreshToken, accessToken } = response;

      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({
        accessToken,
        user: {
          ...user,
          role: UserRole[user.role],
        },
      });
    } catch (error) {
      this.handleError(error, 'sign in');
    }
  }

  async refreshToken(req: Request) {
    const user = req.user as User;
    const refreshTokenFromCookie = (req.cookies as { refreshToken: string })
      .refreshToken;

    try {
      return await firstValueFrom(
        this.authService.refreshToken({
          user,
          refreshToken: refreshTokenFromCookie,
        }),
      );
    } catch (error) {
      this.handleError(error, 'refresh token');
    }
  }

  async signOut(userId: string, res: Response) {
    try {
      await firstValueFrom(this.authService.signOut({ userId }));

      res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
      res.sendStatus(200);
    } catch (error) {
      this.handleError(error, 'sign out');
    }
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
    clerkId: string,
    balance: number,
  ) {
    const nadminToAdminFee = 160000; // $160,00.00

    if (role === UserRole.ADMIN && balance < nadminToAdminFee) {
      throw new BadRequestException(
        `Insufficient balance to upgrade to ADMIN. Minimum required is $160,000.00`,
      );
    }

    try {
      const user = await firstValueFrom(
        this.authService.updateUserRole({ id: userId, role }),
      );

      // Invalidate user cache after role update
      await this.cacheManager.del(`/auth/users/${clerkId}`);

      return {
        ...user,
        role: UserRole[user.role],
      };
    } catch (error) {
      this.handleError(error, `update user role for user with id ${userId}`);
    }
  }

  async findAll() {
    try {
      const findAllResponse = await firstValueFrom(
        this.authService.findAll({}),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return findAllResponse.users.map(({ password, ...rest }) => ({
        ...rest,
        role: UserRole[rest.role],
      }));
    } catch (error) {
      this.handleError(error, 'fetch users');
    }
  }
}
