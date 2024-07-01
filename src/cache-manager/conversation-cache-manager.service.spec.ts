import { ObjectID } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/common';
import { Cache, CachingConfig, Store, WrapArgsType } from 'cache-manager';

import { ConversationCacheManagerService } from './conversation-cache-manager.service';
import { ChatConversationModel } from '../conversation/models/conversation.model';
import { ContextType, Product } from '../conversation/models/ContextSchema.dto';
import { Action, Subject } from '../permissions/models/permissions.model';

const conversation: ChatConversationModel = {
  id: 'testId',
  product: Product.community,
  permissions: [{ action: Action.readConversation, subject: Subject.user }],
  memberIds: [],
  blockedMemberIds: [],
  lastMessageId: new ObjectID(),
  context: [
    {
      type: ContextType.university,
      id: '123',
    },
  ],
};
class MockedCache implements Cache {
  del(key: string): Promise<any>;
  del(key: string, callback: (error: any) => void): void;
  del(key: string, callback?: (error: any) => void): Promise<any> | void {
    if (callback) {
      return callback(null);
    }
    return Promise.resolve(key);
  }

  set<T>(key: string, value: T, options?: CachingConfig): Promise<T>;
  set<T>(key: string, value: T, ttl: number): Promise<T>;
  set<T>(
    key: string,
    value: T,
    options: CachingConfig,
    callback: (error: any) => void,
  ): void;
  set<T>(
    key: string,
    value: T,
    ttl: number,
    callback: (error: any) => void,
  ): void;
  set<T>(
    key: string,
    value: T,
    options?: CachingConfig | number,
  ): Promise<T> | void {
    return Promise.resolve(value);
  }

  wrap<T>(...args: WrapArgsType<T>[]): Promise<T> {
    const t: any = {};
    return Promise.resolve(t);
  }

  get<T>(
    key: string,
    callback: (error: any, result: T | undefined) => void,
  ): void;
  get<T>(key: string): Promise<T | undefined>;
  get<T>(
    key: string,
    callback?: (error: any, result: T | undefined) => void,
  ): Promise<T | undefined> | void {
    const t1: any = conversation;
    if (callback) {
      return callback(null, t1);
    }

    return Promise.resolve(t1);
  }

  reset(): Promise<void>;
  reset(cb: () => void): void;
  reset(cb?: () => void): void | Promise<void> {
    return Promise.resolve();
  }

  store: Store;
}

describe('ConversationCacheService', () => {
  let service: ConversationCacheManagerService;
  let cacheManager: any;

  class MockedConfigService {
    get() {
      return {
        name: 'name',
        ttl: 300,
      };
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationCacheManagerService,
        { provide: ConfigService, useClass: MockedConfigService },
        { provide: CACHE_MANAGER, useClass: MockedCache },
      ],
    }).compile();

    service = module.get<ConversationCacheManagerService>(
      ConversationCacheManagerService,
    );
    cacheManager = module.get<any>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('cache manager should be available', () => {
    expect(cacheManager).toBeDefined();
  });

  it('should set the cache value as Conversation', async () => {
    jest.spyOn(cacheManager, 'set');

    await service.set(conversation, 'key');
    expect(cacheManager.set).toBeCalledWith(
      'name-conversation-key',
      conversation,
      { ttl: 300 },
    );
  });

  it('should return Conversation', async () => {
    await service.set(conversation, 'conversation-key');
    const result = await service.get('conversation-key');
    expect(result).toEqual(conversation);
  });
});
