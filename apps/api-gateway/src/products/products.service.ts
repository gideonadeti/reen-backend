import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GrpcError, MicroserviceError } from '@app/interfaces';
import { FindAllProductsDto } from './dto/find-all-products.dto';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @Inject(PRODUCTS_PACKAGE_NAME) private productsClient: ClientGrpc,
  ) {}

  private productsService: ProductsServiceClient;
  private logger = new Logger(ProductsService.name);

  onModuleInit() {
    this.productsService = this.productsClient.getService(
      PRODUCTS_SERVICE_NAME,
    );
  }

  private handleError(error: any, action: string) {
    this.logger.error(`Failed to ${action}`, (error as GrpcError).stack);

    const microserviceError = JSON.parse(
      (error as GrpcError).details || '{}',
    ) as MicroserviceError;

    if (microserviceError.name === 'NotFoundException') {
      throw new NotFoundException(microserviceError.message);
    }

    throw new InternalServerErrorException(`Failed to ${action}`);
  }

  async create(userId: string, createProductDto: CreateProductDto) {
    try {
      return await firstValueFrom(
        this.productsService.create({
          adminId: userId,
          createProductDto,
        }),
      );
    } catch (error) {
      this.handleError(error, 'create product');
    }
  }

  async findAll(query: FindAllProductsDto) {
    try {
      const response = await firstValueFrom(
        this.productsService.findAll(query),
      );

      if (!query.page && !query.limit) {
        return response.products || []; // [] Else gRPC returns undefined when there are no products
      }

      return {
        ...response,
        products: response.products || [],
      };
    } catch (error) {
      this.handleError(error, 'fetch products');
    }
  }

  async findOne(id: string) {
    try {
      return await firstValueFrom(this.productsService.findOne({ id }));
    } catch (error) {
      this.handleError(error, `fetch product with id ${id}`);
    }
  }

  async update(userId: string, id: string, updateProductDto: UpdateProductDto) {
    try {
      return await firstValueFrom(
        this.productsService.update({
          adminId: userId,
          id,
          updateProductDto,
        }),
      );
    } catch (error) {
      this.handleError(error, `update product with id ${id}`);
    }
  }

  async remove(userId: string, id: string) {
    try {
      return await firstValueFrom(
        this.productsService.remove({ adminId: userId, id }),
      );
    } catch (error) {
      this.handleError(error, `delete product with id ${id}`);
    }
  }
}
