import { Test, TestingModule } from '@nestjs/testing';
import { OrdeServiceController } from './orde-service.controller';
import { OrdeServiceService } from './orde-service.service';

describe('OrdeServiceController', () => {
  let ordeServiceController: OrdeServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OrdeServiceController],
      providers: [OrdeServiceService],
    }).compile();

    ordeServiceController = app.get<OrdeServiceController>(OrdeServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(ordeServiceController.getHello()).toBe('Hello World!');
    });
  });
});
