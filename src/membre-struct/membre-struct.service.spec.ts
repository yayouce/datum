import { Test, TestingModule } from '@nestjs/testing';
import { MembreStructService } from './membre-struct.service';

describe('MembreStructService', () => {
  let service: MembreStructService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MembreStructService],
    }).compile();

    service = module.get<MembreStructService>(MembreStructService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
