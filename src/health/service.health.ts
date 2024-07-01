import { HealthIndicator } from '@nestjs/terminus';

export class ServiceHealthIndicator extends HealthIndicator {
  public check(key: string) {
    const isHealthy = true;
    return this.getStatus(key, isHealthy);
  }
}
