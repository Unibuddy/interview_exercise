import { Cache } from 'cache-manager';
import { Inject, CACHE_MANAGER } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICacheManagerConfig } from '../configuration/configuration';

export abstract class CacheManagerService<CachedObject> {
  private serviceName: string;
  private ttl: number;
  protected abstract cacheName: string;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    const serviceName =
      this.configService.get<ICacheManagerConfig>('cache')?.name;
    const ttl = this.configService.get<ICacheManagerConfig>('cache')?.ttl;

    if (serviceName === undefined || ttl === undefined) {
      throw new Error('Cache Manager Configuration does not exist');
    }

    this.ttl = ttl;
    this.serviceName = serviceName;
  }

  getKeyFormat(key: string): string {
    return `${this.serviceName}-${this.cacheName}-${key}`;
  }

  async get(key: string): Promise<CachedObject | undefined> {
    const formattedKey = this.getKeyFormat(key);
    return await this.cacheManager.get(formattedKey);
  }

  async set(data: CachedObject, key: string) {
    const formattedKey = this.getKeyFormat(key);
    await this.cacheManager.set(formattedKey, data, { ttl: this.ttl });
  }

  async del(key: string) {
    const formattedKey = this.getKeyFormat(key);
    await this.cacheManager.del(formattedKey);
  }

  async getOrSet(
    key: string,
    request: (key: string) => Promise<CachedObject>,
  ): Promise<CachedObject> {
    let response;
    response = await this.get(key);

    if (response) {
      return response;
    }

    response = await request(key);

    await this.set(response, key);
    return response;
  }
}
