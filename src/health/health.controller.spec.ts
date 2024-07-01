import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from './service.health';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      imports: [TerminusModule],
      providers: [ServiceHealthIndicator],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
