import { Injectable } from '@nestjs/common';

@Injectable()
export class CheckoutService {
  checkout(userId: string) {
    return { userId };
  }
}
