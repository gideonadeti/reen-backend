import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  private readonly logger = new Logger(LocalStrategy.name);

  async validate(email: string, password: string) {
    try {
      const user = await this.authService.validateUser(email, password);

      if (Object.keys(user).length === 0) {
        throw new UnauthorizedException('Invalid email or password');
      }

      return user;
    } catch (error) {
      this.logger.error('Failed to validate user', (error as Error).stack);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to validate user');
    }
  }
}
