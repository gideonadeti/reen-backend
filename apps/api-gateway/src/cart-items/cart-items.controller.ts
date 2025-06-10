import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { CartItemsService } from './cart-items.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../auth/decorators/user-id.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart-items')
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Post()
  create(
    @UserId() userId: string,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    return this.cartItemsService.create(userId, createCartItemDto);
  }

  @Get()
  findAll(@UserId() userId: string) {
    return this.cartItemsService.findAll(userId);
  }

  @Get(':id')
  findOne(@UserId() userId: string, @Param('id') id: string) {
    return this.cartItemsService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartItemsService.update(userId, id, updateCartItemDto);
  }

  @Delete(':id')
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.cartItemsService.remove(userId, id);
  }
}
