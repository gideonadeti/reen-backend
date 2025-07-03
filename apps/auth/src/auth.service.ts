import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';
import { AuthPayload } from '@app/interfaces';
import { Balance, User as PrismaUser } from '../generated/prisma';
import {
  ChargeFeeRequest,
  FindAllRequest,
  FindOrCreateAnonymousUserRequest,
  RefreshTokenRequest,
  SignOutRequest,
  SignUpRequest,
  UndoChargeFeeRequest,
  UpdateFinancialInfosRequest,
  UpdateNameAndEmailRequest,
  UpdatePurchasesAndSalesCountsRequest,
  UpdateUserRoleRequest,
  User,
  UserRole,
  ValidateUserRequest,
} from '@app/protos/generated/auth';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  private logger = new Logger(AuthService.name);

  private async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(10);

    return bcrypt.hash(password, salt);
  }

  private async handleSuccessfulAuth(user: User) {
    const payload = this.createAuthPayload(user) as AuthPayload;
    const accessToken = this.createJwtToken('access', payload);
    const refreshToken = this.createJwtToken('refresh', payload);
    const hashedRefreshToken = await this.hashPassword(refreshToken);
    const userId = user.id;
    const existingRefreshToken =
      await this.prismaService.refreshToken.findUnique({
        where: { userId },
      });

    if (existingRefreshToken) {
      await this.prismaService.refreshToken.update({
        where: { userId },
        data: { value: hashedRefreshToken },
      });
    } else {
      await this.prismaService.refreshToken.create({
        data: { userId, value: hashedRefreshToken },
      });
    }

    return {
      refreshToken,
      accessToken,
      user,
    };
  }

  private createAuthPayload(user: User) {
    return { email: user.email, sub: user.id, role: user.role, jti: uuidv4() };
  }

  private createJwtToken(type: 'access' | 'refresh', payload: AuthPayload) {
    return this.jwtService.sign(payload, {
      ...(type === 'refresh' && {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    });
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as Error).stack);

    throw new RpcException(JSON.stringify(error));
  }

  async signUp(signUpRequest: SignUpRequest) {
    try {
      let user: PrismaUser & { balances: Balance[] };

      if (!signUpRequest.password) {
        user = await this.prismaService.user.create({
          data: signUpRequest,
          include: {
            balances: true,
          },
        });
      } else {
        const hashedPassword = await this.hashPassword(signUpRequest.password);

        user = await this.prismaService.user.create({
          data: {
            ...signUpRequest,
            password: hashedPassword,
          },
          include: {
            balances: true,
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = user;

      return await this.handleSuccessfulAuth({
        ...rest,
        clerkId: rest.clerkId as string | undefined,
        role: UserRole[rest.role],
      });
    } catch (error) {
      this.handleError(error, 'sign up');
    }
  }

  async validateUser({ email, pass }: ValidateUserRequest) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) return {};
      if (!user.password) return {};

      const isCorrectPassword = await bcrypt.compare(pass, user.password);

      if (!isCorrectPassword) return {};

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = user;

      return rest;
    } catch (error) {
      this.handleError(error, 'validate user');
    }
  }

  async signIn(user: User) {
    try {
      return await this.handleSuccessfulAuth(user);
    } catch (error) {
      this.handleError(error, 'sign in');
    }
  }

  async refreshToken({ user, refreshToken }: RefreshTokenRequest) {
    try {
      const existingRefreshToken =
        await this.prismaService.refreshToken.findUnique({
          where: { userId: user!.id },
        });

      if (!existingRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isCorrectRefreshToken = await bcrypt.compare(
        refreshToken,
        existingRefreshToken.value,
      );

      if (!isCorrectRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = this.createAuthPayload(user as User) as AuthPayload;
      const accessToken = this.createJwtToken('access', payload);

      return { accessToken };
    } catch (error) {
      this.handleError(error, 'refresh token');
    }
  }

  async signOut({ userId }: SignOutRequest) {
    try {
      return await this.prismaService.refreshToken.delete({
        where: { userId },
      });
    } catch (error) {
      this.handleError(error, 'sign out');
    }
  }

  async findUser(id: string) {
    try {
      return await this.prismaService.user.findUnique({ where: { id } });
    } catch (error) {
      this.handleError(error, `find user with id ${id}`);
    }
  }

  async findAdmins(adminIds: string[]) {
    try {
      const admins = await this.prismaService.user.findMany({
        where: { id: { in: adminIds } },
      });

      return {
        admins,
      };
    } catch (error) {
      this.handleError(error, `fetch admins`);
    }
  }

  async updateUserRole({ id, role }: UpdateUserRoleRequest) {
    const roleUpgradeFee = 160000;
    const prismaUserRole = role === UserRole.ADMIN ? 'ADMIN' : 'NADMIN';

    try {
      const user = await this.prismaService.user.findUnique({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // If upgrading to ADMIN
      if (role === UserRole.ADMIN) {
        const newBalance = user.balance - roleUpgradeFee;

        const updatedUser = await this.prismaService.user.update({
          where: { id },
          data: {
            role: prismaUserRole,
            balance: { decrement: roleUpgradeFee },
            amountSpent: { increment: roleUpgradeFee },
            balances: {
              create: {
                amount: newBalance,
              },
            },
          },
          include: { balances: true },
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = updatedUser;

        return rest;
      }

      // If just changing role (e.g., demoting to NADMIN)
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: {
          role: prismaUserRole,
        },
        include: { balances: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = updatedUser;

      return rest;
    } catch (error) {
      this.handleError(error, `update user role for user with id ${id}`);
    }
  }

  async findUserByClerkId(clerkId: string) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { clerkId },
        include: {
          balances: true,
        },
      });

      // Return `{}` if user is not found to avoid gRPC converting null to User
      if (!user) return {};

      return user;
    } catch (error) {
      this.handleError(error, `find user with clerkId ${clerkId}`);
    }
  }

  async findByIds(ids: string[]) {
    try {
      const users = await this.prismaService.user.findMany({
        where: { id: { in: ids } },
      });

      return {
        users,
      };
    } catch (error) {
      this.handleError(error, `find users with ids in ${JSON.stringify(ids)}`);
    }
  }

  async updateFinancialInfos({
    userId,
    adminId,
    amount,
    userNewBalance,
    adminNewBalance,
    idempotencyKey,
  }: UpdateFinancialInfosRequest) {
    try {
      const idempotencyRecord =
        await this.prismaService.idempotencyRecord.findUnique({
          where: { key: idempotencyKey },
        });

      // If the idempotency record exists, it means the operation has already been processed.
      if (idempotencyRecord !== null) {
        return {
          balanceIds: [],
        };
      }

      const transactionResults = await this.prismaService.$transaction([
        this.prismaService.user.update({
          where: { id: userId },
          data: {
            balance: { decrement: amount },
            amountSpent: { increment: amount },
          },
        }),
        this.prismaService.balance.create({
          data: {
            amount: userNewBalance,
            userId,
          },
        }),
        this.prismaService.user.update({
          where: { id: adminId },
          data: {
            balance: { increment: amount },
            amountGained: { increment: amount },
          },
        }),
        this.prismaService.balance.create({
          data: {
            amount: adminNewBalance,
            userId: adminId,
          },
        }),
        this.prismaService.idempotencyRecord.create({
          data: { key: idempotencyKey },
        }),
      ]);

      const userBalanceId = transactionResults[1].id;
      const adminBalanceId = transactionResults[3].id;

      return {
        balanceIds: [userBalanceId, adminBalanceId],
      };
    } catch (error) {
      this.handleError(error, `update balances`);
    }
  }

  async removeIdempotencyRecordsByKeys(keys: string[]) {
    try {
      await this.prismaService.idempotencyRecord.deleteMany({
        where: { key: { in: keys } },
      });

      return {};
    } catch (error) {
      this.handleError(error, `remove idempotency records by keys`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findAll(data: FindAllRequest) {
    try {
      const users = await this.prismaService.user.findMany({
        include: {
          balances: true,
        },
      });

      return {
        users,
      };
    } catch (error) {
      this.handleError(error, `fetch all users`);
    }
  }

  async updatePurchasesAndSalesCounts({
    userId,
    adminIds,
  }: UpdatePurchasesAndSalesCountsRequest) {
    try {
      await this.prismaService.$transaction([
        this.prismaService.user.update({
          where: { id: userId },
          data: {
            purchasesCount: { increment: 1 },
          },
        }),
        this.prismaService.user.updateMany({
          where: { id: { in: adminIds } },
          data: {
            salesCount: { increment: 1 },
          },
        }),
      ]);

      return {};
    } catch (error) {
      this.handleError(error, `update purchases and sales counts`);
    }
  }

  async undoUpdateFinancialInfos({
    userId,
    adminId,
    amount,
    idempotencyKey,
  }: UpdateFinancialInfosRequest) {
    try {
      const idempotencyRecord =
        await this.prismaService.idempotencyRecord.findUnique({
          where: { key: idempotencyKey },
        });

      // If the idempotency record exists, it means the operation has already been processed.
      if (idempotencyRecord !== null) {
        return {};
      }

      await this.prismaService.$transaction([
        this.prismaService.user.update({
          where: { id: userId },
          data: {
            balance: { increment: amount },
            amountSpent: { decrement: amount },
          },
        }),
        this.prismaService.user.update({
          where: { id: adminId },
          data: {
            balance: { decrement: amount },
            amountGained: { decrement: amount },
          },
        }),
        this.prismaService.idempotencyRecord.create({
          data: { key: idempotencyKey },
        }),
      ]);

      return {};
    } catch (error) {
      this.handleError(error, 'undo update financial infos');
    }
  }

  async removeBalancesByIds(ids: string[]) {
    try {
      await this.prismaService.balance.deleteMany({
        where: { id: { in: ids } },
      });

      return {};
    } catch (error) {
      this.handleError(error, 'remove balances by ids');
    }
  }

  async chargeFee({ userId, amount }: ChargeFeeRequest) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const transactionResults = await this.prismaService.$transaction([
        this.prismaService.user.update({
          where: { id: userId },
          data: {
            balance: { decrement: amount },
            amountSpent: { increment: amount },
          },
        }),
        this.prismaService.balance.create({
          data: {
            amount: user.balance - amount,
            userId,
          },
        }),
      ]);

      const balanceId = transactionResults[1].id;

      return {
        balanceId,
      };
    } catch (error) {
      this.handleError(error, 'charge fee');
    }
  }

  async undoChargeFee({ userId, amount, balanceId }: UndoChargeFeeRequest) {
    try {
      await this.prismaService.$transaction([
        this.prismaService.user.update({
          where: { id: userId },
          data: {
            balance: { increment: amount },
            amountSpent: { decrement: amount },
          },
        }),
        this.prismaService.balance.delete({
          where: { id: balanceId },
        }),
      ]);
    } catch (error) {
      this.handleError(error, 'undo charge fee');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findOrCreateAnonymousUser(data: FindOrCreateAnonymousUserRequest) {
    try {
      let user = await this.prismaService.user.findFirst({
        where: { role: 'ANONYMOUS' },
      });

      if (!user) {
        user = await this.prismaService.user.create({
          data: {
            email: '',
            name: '',
            role: 'ANONYMOUS',
          },
        });
      }

      return user;
    } catch (error) {
      this.handleError(error, 'find or create anonymous user');
    }
  }

  async updateNameAndEmail({ id, name, email }: UpdateNameAndEmailRequest) {
    try {
      return await this.prismaService.user.update({
        where: { id },
        data: { name, email },
      });
    } catch (error) {
      this.handleError(error, 'update name and email');
    }
  }
}
