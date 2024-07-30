import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ServiceHealthIndicator } from './service.health';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  controllers: [HealthController],
  imports: [TerminusModule, MongooseModule],
  providers: [ServiceHealthIndicator],
})
export class HealthModule {}
