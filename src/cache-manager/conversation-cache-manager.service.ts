import { Cache } from 'cache-manager';
import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheManagerService } from './cache-manager.service';
import { ChatConversationModel } from '../conversation/models/conversation.model';

@Injectable()
export class ConversationCacheManagerService extends CacheManagerService<ChatConversationModel> {
  protected cacheName = 'conversation';
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    configService: ConfigService,
  ) {
    super(cacheManager, configService);
  }
}
