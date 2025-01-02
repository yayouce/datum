import { Test, TestingModule } from '@nestjs/testing';
import { EnqueteService } from './enquete.service';

describe('EnqueteService', () => {
  let service: EnqueteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnqueteService],
    }).compile();

    service = module.get<EnqueteService>(EnqueteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
