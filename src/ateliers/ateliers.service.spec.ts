import { Test, TestingModule } from '@nestjs/testing';
import { AteliersService } from './ateliers.service';

describe('AteliersService', () => {
  let service: AteliersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AteliersService],
    }).compile();

    service = module.get<AteliersService>(AteliersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
