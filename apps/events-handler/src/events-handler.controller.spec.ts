import { Test, TestingModule } from '@nestjs/testing';
import { EventsHandlerController } from './events-handler.controller';
import { EventsHandlerService } from './events-handler.service';

describe('EventsHandlerController', () => {
  let eventsHandlerController: EventsHandlerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [EventsHandlerController],
      providers: [EventsHandlerService],
    }).compile();

    eventsHandlerController = app.get<EventsHandlerController>(EventsHandlerController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(eventsHandlerController.getHello()).toBe('Hello World!');
    });
  });
});
