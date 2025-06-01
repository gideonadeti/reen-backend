import { SignUpRequest } from '@app/protos';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  signUp(signUpRequest: SignUpRequest) {
    this.logger.log(`signUpRequest: ${JSON.stringify(signUpRequest)}`);

    return { message: 'success' };
  }
}
