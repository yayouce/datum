import { Test, TestingModule } from '@nestjs/testing';
import { MembreStructController } from './membre-struct.controller';
import { MembreStructService } from './membre-struct.service';

describe('MembreStructController', () => {
  let controller: MembreStructController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembreStructController],
      providers: [MembreStructService],
    }).compile();

    controller = module.get<MembreStructController>(MembreStructController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
