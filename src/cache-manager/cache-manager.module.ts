import { CacheModule, CacheStoreFactory, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import redisStore from 'cache-manager-redis-store';
import { ICacheManagerConfig } from '../configuration/configuration';
import { ConversationCacheManagerService } from './conversation-cache-manager.service';
import { UserCacheManagerService } from './user-cache-manager.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ICacheManagerConfig>('cache');
        if (!config) throw new Error('Could not find cache config');
        return {
          store: redisStore as CacheStoreFactory,
          host: config.url,
          port: config.port,
          max: config.maxItems,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    UserCacheManagerService,
    ConfigService,
    ConversationCacheManagerService,
  ],
  exports: [UserCacheManagerService, ConversationCacheManagerService],
})
export class CacheManagerModule {}
