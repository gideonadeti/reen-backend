import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }
}
