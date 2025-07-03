import { CacheInterceptor } from '@nestjs/cache-manager';
import { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User, UserRole } from '@app/protos/generated/auth';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { UserId } from './decorators/user-id.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto, @Res() res: Response) {
    return this.authService.signUp(signUpDto, res);
  }

  @ApiBody({ type: SignInDto })
  @UseGuards(LocalAuthGuard)
  @Post('sign-in')
  signIn(@Req() req: Request & { user: User }, @Res() res: Response) {
    return this.authService.signIn(req.user, res);
  }

  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh-token')
  refreshToken(@Req() req: Request) {
    return this.authService.refreshToken(req);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sign-out')
  signOut(@UserId() userId: string, @Res() res: Response) {
    return this.authService.signOut(userId, res);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('update-user-role')
  updateUserRole(
    @Req() req: Request & { user: User },
    @UserId() userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    const role =
      updateUserRoleDto.role === 'ADMIN' ? UserRole.ADMIN : UserRole.NADMIN;

    return this.authService.updateUserRole(
      userId,
      role,
      req.user.clerkId as string,
      req.user.balance,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @Get('users/:id')
  findUser(@Req() req: Request) {
    const user = req.user as User;

    return {
      ...user,
      role: UserRole[user.role],
    };
  }

  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @Get('find-all')
  findAll() {
    return this.authService.findAll();
  }
}
