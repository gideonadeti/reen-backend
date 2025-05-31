import { Test, TestingModule } from '@nestjs/testing';
import { ProtosService } from './protos.service';

describe('ProtosService', () => {
  let service: ProtosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProtosService],
    }).compile();

    service = module.get<ProtosService>(ProtosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
