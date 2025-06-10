import { Test, TestingModule } from '@nestjs/testing';
import { CartItemsController } from './cart-items.controller';
import { CartItemsService } from './cart-items.service';

describe('CartItemsController', () => {
  let cartItemsController: CartItemsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CartItemsController],
      providers: [CartItemsService],
    }).compile();

    cartItemsController = app.get<CartItemsController>(CartItemsController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(cartItemsController.getHello()).toBe('Hello World!');
    });
  });
});
