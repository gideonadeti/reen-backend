import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { ProductsService } from './products.service';
import {
  CreateRequest,
  PRODUCTS_SERVICE_NAME,
} from '@app/protos/generated/products';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @GrpcMethod(PRODUCTS_SERVICE_NAME)
  create(data: CreateRequest) {
    return this.productsService.create(data);
  }
}
