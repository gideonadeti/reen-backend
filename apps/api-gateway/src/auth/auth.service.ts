import { CookieOptions, Request, Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { SignUpDto } from './dtos/sign-up.dto';
import {
  AUTH_PACKAGE_NAME,
  AUTH_SERVICE_NAME,
  AuthServiceClient,
  User,
  UserRole,
} from '@app/protos';
import { GrpcError, MicroserviceError } from '@app/interfaces';

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/auth/refresh-token',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(@Inject(AUTH_PACKAGE_NAME) private authClient: ClientGrpc) {}

  private authService: AuthServiceClient;
  private logger = new Logger(AuthService.name);

  onModuleInit() {
    this.authService =
      this.authClient.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }

  private handleError(error: GrpcError, action: string) {
    this.logger.error(`Failed to ${action}`, error.stack);

    const microserviceError = JSON.parse(error.details) as MicroserviceError;

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
      this.handleError(error as GrpcError, 'sign up');
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
      this.handleError(error as GrpcError, 'sign in');
    }
  }

  async refreshToken(req: Request, res: Response) {
    const user = req.user as User;
    const refreshTokenFromCookie = (req.cookies as { refreshToken: string })
      .refreshToken;

    try {
      const response = await firstValueFrom(
        this.authService.refreshToken({
          user,
          refreshToken: refreshTokenFromCookie,
        }),
      );

      res.json(response);
    } catch (error) {
      this.handleError(error as GrpcError, 'refresh token');
    }
  }
}
