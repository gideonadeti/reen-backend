import { ApiBearerAuth } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Request } from 'express';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  Req,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '@app/protos/generated/auth';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
import { FindAllProductsDto } from './dto/find-all-products.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@UseGuards(ClerkAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Req() req: Request & { user: User },
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(
      req.user.id,
      createProductDto,
      req.user.clerkId as string,
    );
  }

  @UseInterceptors(CacheInterceptor)
  @Get()
  findAll(@Query() query: FindAllProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Req() req: Request & { user: User },
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(
      req.user.id,
      id,
      updateProductDto,
      req.user.clerkId as string,
    );
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.productsService.remove(userId, id);
  }
}
