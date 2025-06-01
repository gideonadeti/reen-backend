import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SignInDto } from './dtos/sign-in.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { User } from '@app/protos';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';

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
}
