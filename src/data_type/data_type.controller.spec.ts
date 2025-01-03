import { Test, TestingModule } from '@nestjs/testing';
import { DataTypeController } from './data_type.controller';
import { DataTypeService } from './data_type.service';

describe('DataTypeController', () => {
  let controller: DataTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataTypeController],
      providers: [DataTypeService],
    }).compile();

    controller = module.get<DataTypeController>(DataTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
