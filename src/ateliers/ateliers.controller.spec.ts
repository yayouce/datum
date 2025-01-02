import { Test, TestingModule } from '@nestjs/testing';
import { AteliersController } from './ateliers.controller';
import { AteliersService } from './ateliers.service';

describe('AteliersController', () => {
  let controller: AteliersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AteliersController],
      providers: [AteliersService],
    }).compile();

    controller = module.get<AteliersController>(AteliersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
