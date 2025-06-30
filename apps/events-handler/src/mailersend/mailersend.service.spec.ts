import { Test, TestingModule } from '@nestjs/testing';
import { MailersendService } from './mailersend.service';

describe('MailersendService', () => {
  let service: MailersendService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailersendService],
    }).compile();

    service = module.get<MailersendService>(MailersendService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
