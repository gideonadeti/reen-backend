import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

describe('CheckoutController', () => {
  let checkoutController: CheckoutController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [CheckoutService],
    }).compile();

    checkoutController = app.get<CheckoutController>(CheckoutController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(checkoutController.getHello()).toBe('Hello World!');
    });
  });
});
