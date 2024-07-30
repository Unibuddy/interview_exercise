import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { ConfigService } from '@nestjs/config';
import { Cache, CachingConfig, Store, WrapArgsType } from 'cache-manager';

const testId = '123456789';
const testName = 'test-name';

const testId2 = '987654321';
const testName2 = 'test2-name';

class TestObject {
  id: string;
  name: string;
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}

class TestCacheManagerService extends CacheManagerService<TestObject> {
  protected cacheName = 'default';
}

const requestFunction = jest.fn(async (key: string): Promise<any> => {
  return Promise.resolve(new TestObject(testId, testName));
});

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
    const t1: any = { id: testId, name: testName };
    const t2: any = {
      id: testId2,
      name: testName2,
    };
    if (callback) {
      return callback(null, t1);
    }

    if (key === 'name-default-key' || key === 'name-default-key1') {
      return Promise.resolve(t1);
    }
    if (key === 'name-default-key2') {
      return Promise.resolve(t2);
    }
  }

  reset(): Promise<void>;
  reset(cb: () => void): void;
  reset(cb?: () => void): void | Promise<void> {
    return Promise.resolve();
  }

  store: Store;
}

class MockedConfigService {
  get() {
    return {
      name: 'name',
      ttl: 300,
    };
  }
}
describe('UserCacheService', () => {
  let service: CacheManagerService<TestObject>;
  let cacheManager: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestCacheManagerService,
        { provide: ConfigService, useClass: MockedConfigService },
        { provide: CACHE_MANAGER, useClass: MockedCache },
      ],
    }).compile();

    service = module.get<TestCacheManagerService>(TestCacheManagerService);
    cacheManager = module.get<any>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('cache manager should be available', () => {
    expect(cacheManager).toBeDefined();
  });

  it('should set the cache value', async () => {
    jest.spyOn(cacheManager, 'set');
    await service.set(new TestObject(testId, testName), 'key');
    expect(cacheManager.set).toBeCalledWith(
      'name-default-key',
      {
        id: '123456789',
        name: 'test-name',
      },
      { ttl: 300 },
    );
  });

  it('should get the cache value', async () => {
    await service.set(new TestObject(testId, testName), 'key');
    const result = await service.get('key');
    expect(result).toEqual({ id: '123456789', name: 'test-name' });
  });

  describe('if the cache value is not present', () => {
    it('should call the request function and set the value in the cache', async () => {
      jest.spyOn(cacheManager, 'set');
      await service.getOrSet('wrong-key', requestFunction);

      expect(requestFunction).toBeCalledWith('wrong-key');
      expect(cacheManager.set).toBeCalledWith(
        'name-default-key',
        {
          id: '123456789',
          name: 'test-name',
        },
        { ttl: 300 },
      );
    });
  });

  describe('if the cache value is present', () => {
    it('should not call the request function and not set the value in the cache', async () => {
      jest.spyOn(cacheManager, 'set');
      const result = await service.getOrSet('key', requestFunction);

      expect(requestFunction).not.toBeCalledWith('key');
      expect(cacheManager.set).not.toBeCalledWith(
        'chat-service-key',
        {
          id: testId,
          name: testName,
        },
        { ttl: 300 },
      );
      expect(result).toEqual({ id: '123456789', name: 'test-name' });
    });
  });

  describe('if there are multiple values in the cache', () => {
    it('should match to the right key', async () => {
      await service.set(new TestObject(testId, testName), 'key1');
      await service.set(new TestObject(testId2, testName2), 'key2');

      const result1 = await service.get('key1');
      const result2 = await service.get('key2');

      expect(result1).toEqual({ id: '123456789', name: 'test-name' });
      expect(result2).toEqual({ id: '987654321', name: 'test2-name' });
    });
  });
});
