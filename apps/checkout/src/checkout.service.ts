import { Injectable } from '@nestjs/common';

@Injectable()
export class CheckoutService {
  getHello(): string {
    return 'Hello World!';
  }
}
