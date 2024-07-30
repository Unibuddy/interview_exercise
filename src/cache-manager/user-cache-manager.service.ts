import { Cache } from 'cache-manager';
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { User } from '../user/models/user.model';
import { CacheManagerService } from './cache-manager.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserCacheManagerService extends CacheManagerService<User> {
  protected cacheName = 'user';
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    configService: ConfigService,
  ) {
    super(cacheManager, configService);
  }
}
