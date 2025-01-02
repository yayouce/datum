import { Test, TestingModule } from '@nestjs/testing';
import { EnqueteController } from './enquete.controller';
import { EnqueteService } from './enquete.service';

describe('EnqueteController', () => {
  let controller: EnqueteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnqueteController],
      providers: [EnqueteService],
    }).compile();

    controller = module.get<EnqueteController>(EnqueteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
