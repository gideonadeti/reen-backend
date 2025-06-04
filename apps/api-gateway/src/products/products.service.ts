import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GrpcError } from '@app/interfaces';
import { FindAllProductsDto } from './dto/find-all-products.dto';
import {
  PRODUCTS_PACKAGE_NAME,
  PRODUCTS_SERVICE_NAME,
  ProductsServiceClient,
} from '@app/protos/generated/products';

@Injectable()
export class ProductsService {
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
        this.productsService.findAll({
          ...query,
          name: query.name as string,
          minPrice: query.minPrice as number,
          maxPrice: query.maxPrice as number,
          minQuantity: query.minQuantity as number,
          maxQuantity: query.maxQuantity as number,
          sortBy: query.sortBy as string,
          order: query.order as string,
          limit: query.limit as number,
          page: query.page as number,
        }),
      );

      if (!query.page && !query.limit) {
        return response.products || []; // [] Else gRPC returns undefined when there are no products
      }

      return response;
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

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
