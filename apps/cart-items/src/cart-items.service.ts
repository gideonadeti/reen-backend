import { Injectable } from '@nestjs/common';

@Injectable()
export class CartItemsService {
  getHello(): string {
    return 'Hello World!';
  }
}
