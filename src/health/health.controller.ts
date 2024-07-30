import { Controller, Get } from '@nestjs/common';

import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

import { ServiceHealthIndicator } from './service.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private service: ServiceHealthIndicator,
    private mongoose: MongooseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.service.check('chat-service'),
      async () => this.mongoose.pingCheck('database'),
    ]);
  }
}
