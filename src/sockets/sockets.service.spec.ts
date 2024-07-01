import { Test, TestingModule } from '@nestjs/testing';
import {
  BaseEventType,
  Channel,
  ISocketsService,
  PusherTypes,
  SocketsService,
} from './sockets.service';
import Pusher from 'pusher';
import { ObjectID } from 'mongodb';
import {
  ConfigurationManager,
  MockedConfigurationManager,
} from '../configuration/configuration-manager';

jest.mock('pusher');

afterEach(() => {
  jest.clearAllMocks();
});

describe('sockets service with sendPusherMessages true', () => {
  let service: SocketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        SocketsService,
        { provide: ConfigurationManager, useFactory: () =>
          new MockedConfigurationManager({
            pusher: {
              secretKey: '1',
              appId: '1',
              key: '1',
              sendPusherMessages: true,
            },
          }), 
        },
      ],
    }).compile();

    service = module.get<SocketsService>(SocketsService);
  });

  it('should instantiate pusher with the config credentials', () => {
    service.send({ channel: 'channel', event: 'event', message: 'message' });
    expect(Pusher).toBeCalledWith({
      appId: '1',
      cluster: 'eu',
      key: '1',
      secret: '1',
      useTLS: true,
    });
  });

  it('should trigger pusher', () => {
    service.send({ channel: 'channel', event: 'event', message: 'message' });
    expect(Pusher.prototype.trigger).toBeCalledWith(
      'channel',
      'event',
      'message',
    );
  });

  it('should return private formatted name', () => {
    const channelName = 'test-channel';
    const privateName = service.getFormattedName(channelName, true);

    expect(privateName).toEqual(`private-${channelName}`);
  });

  it('should return public formatted name', () => {
    const channelName = 'test-channel';
    const privateName = service.getFormattedName(channelName, false);

    expect(privateName).toEqual(channelName);
  });
});

describe('sockets service with sendPusherMessages false', () => {
  let service: SocketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        SocketsService,
        {
          provide: ConfigurationManager,
          useFactory: () =>
            new MockedConfigurationManager({
              pusher: {
                secretKey: '1d7de086b3678f477256',
                appId: '273989',
                key: '29543470517ba526ec5a',
                sendPusherMessages: false,
              },
            }),
        },
      ],
    }).compile();

    service = module.get<SocketsService>(SocketsService);
  });

  it('should instantiate pusher with the config credentials', () => {
    service.send({ channel: 'channel', event: 'event', message: 'message' });
    expect(Pusher).toBeCalledWith({
      appId: '273989',
      cluster: 'eu',
      key: '29543470517ba526ec5a',
      secret: '1d7de086b3678f477256',
      useTLS: true,
    });
  });

  it('should not trigger pusher', () => {
    service.send({ channel: 'channel', event: 'event', message: 'message' });
    expect(Pusher.prototype.trigger).not.toBeCalled();
  });
});

describe('channel', () => {
  let channel: Channel<TestEventType>;
  let socketsService: SocketsService;
  const channelId = String(new ObjectID('321b1a570ff321b1a570ff01'));

  class TestMessage {
    constructor(message: string) {
      this.message = message;
    }
    id: ObjectID;
    message: string;
  }

  class TestEventType implements BaseEventType {
    public name = 'test-event';
    constructor(public message: TestMessage) {}
  }

  class MockedSocketsService implements ISocketsService {
    send(data: PusherTypes): void {
    }
    getFormattedName(channelName: string, isPrivate: boolean): string {
      return `${channelName}-${isPrivate}`;
    }
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [],
      providers: [
        {
          provide: Channel,
          inject: [SocketsService],
          useFactory: (socketsService: SocketsService) => {
            return new Channel<TestEventType>(
              'test-channel',
              true,
              socketsService,
            );
          },
        },
        { provide: SocketsService, useClass: MockedSocketsService },
      ],
    }).compile();

    socketsService = module.get<SocketsService>(SocketsService);
    channel = module.get<Channel<TestEventType>>(Channel);
  });

  it('should call the socket service on send', () => {
    jest.spyOn(socketsService, 'send');
    const testEventType = new TestEventType(
      new TestMessage('I am a test message'),
    );

    channel.send(testEventType, channelId);
    expect(socketsService.send).toBeCalledWith({
      channel: 'test-channel-true-321b1a570ff321b1a570ff01',
      event: 'test-event',
      message: '{"message":"I am a test message"}',
    });
  });
});
