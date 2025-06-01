import { Injectable } from '@nestjs/common';
import { Response } from 'express';

import { SignUpDto } from './dtos/sign-up.dto';

@Injectable()
export class AuthService {
  signUp(signUpDto: SignUpDto, res: Response) {
    res.json(signUpDto);
  }
}
