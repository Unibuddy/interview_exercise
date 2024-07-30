import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { UserCacheManagerService } from './user-cache-manager.service';
import { User } from '../user/models/user.model';
import { ConfigService } from '@nestjs/config';
import { CachingConfig, Store, WrapArgsType } from 'cache-manager';

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
    const t1: any = {
      id: '123',
      email: 'email@email.com',
      firstName: 'first name',
      lastName: 'last name',
    };
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

describe('UserCacheService', () => {
  let service: UserCacheManagerService;
  let cacheManager: any;
  let user: User;

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
        UserCacheManagerService,
        { provide: ConfigService, useClass: MockedConfigService },
        { provide: CACHE_MANAGER, useClass: MockedCache },
      ],
    }).compile();

    user = new User();
    user.id = '123';
    user.email = 'email@email.com';
    user.firstName = 'first name';
    user.lastName = 'last name';
    service = module.get<UserCacheManagerService>(UserCacheManagerService);
    cacheManager = module.get<any>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('cache manager should be available', () => {
    expect(cacheManager).toBeDefined();
  });

  it('should set the cache value as User', async () => {
    jest.spyOn(cacheManager, 'set');

    await service.set(user, 'key');
    expect(cacheManager.set).toBeCalledWith(
      'name-user-key',
      {
        email: 'email@email.com',
        firstName: 'first name',
        id: '123',
        lastName: 'last name',
      },
      { ttl: 300 },
    );
  });

  it('should return User type', async () => {
    await service.set(user, 'key');
    const result = await service.get('key');
    expect(result).toEqual({
      email: 'email@email.com',
      firstName: 'first name',
      id: '123',
      lastName: 'last name',
    });
  });
});
