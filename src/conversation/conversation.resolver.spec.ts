import { ObjectID } from 'mongodb';
import { Test, TestingModule } from '@nestjs/testing';

import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { ConversationResolver } from './conversation.resolver';
import { ConversationDTO, ConversationLogic } from './conversation.logic';
import { ConversationData } from './conversation.data';
import {
  ChatMessageDataLoader,
  IChatMessageDataLoader,
} from '../message/message.dataloader';
import { ChatMessage } from '../message/models/message.entity';
import { Product } from './models/ContextSchema.dto';

describe('ConversationResolver', () => {
  let resolver: ConversationResolver;
  let conversationLogic: ConversationLogic;
  let messageDataLoader: ChatMessageDataLoader;

  class MockedConversationData {
    create() {
      return;
    }
  }

  class MockedLogic {
    MockedLogic() {
      return;
    }

    getConversation() {
      return;
    }

    getUnreadMessageCounts() {
      return;
    }

    getLastMessages() {
      return;
    }

    recordLastMessageReadByUser() {
      return;
    }
  }

  class MockedDataLoader implements IChatMessageDataLoader {
    loadMany(ids: ObjectID[]): Promise<ChatMessage[]> {
      throw new Error('Method not implemented');
    }
    load(id: ObjectID): Promise<ChatMessage> {
      throw new Error('Method not implemented');
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationResolver,
        { provide: ConversationLogic, useClass: MockedLogic },
        { provide: ConversationData, useClass: MockedConversationData },
        { provide: ChatMessageDataLoader, useClass: MockedDataLoader },
      ],
    }).compile();

    resolver = module.get<ConversationResolver>(ConversationResolver);
    conversationLogic = module.get<ConversationLogic>(ConversationLogic);
    messageDataLoader = module.get<ChatMessageDataLoader>(
      ChatMessageDataLoader,
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('getChatConversation should be defined', () => {
    expect(resolver.getChatConversation).toBeDefined();
  });

  describe('Unread messages', () => {
    const testConversationIds = ['conversation001', 'conversation002'];
    const testUserObjectId = new ObjectID();
    const testMemberId = testUserObjectId.toHexString();
    const testMessageId = new ObjectID();
    const authenticatedUser: IAuthenticatedUser = {
      userId: testUserObjectId,
      accountRole: 'applicant',
      universityId: new ObjectID(),
    };

    it('unreadMessageCount should be defined', () => {
      expect(resolver.unreadMessageCount).toBeDefined();
    });

    it('lastMessageId should be defined', () => {
      expect(resolver.lastMessage).toBeDefined();
    });

    it('recordLastMessageReadByUser should be defined', () => {
      expect(resolver.recordLastMessageReadByUser).toBeDefined();
    });

    it('Call logic layer to resolve unreadMessageCount', async () => {
      const logicSpy = jest
        .spyOn(conversationLogic, 'getUnreadMessageCounts')
        .mockImplementationOnce(() => {
          return Promise.resolve([
            {
              id: testConversationIds[0],
              unreadMessageCount: 0,
            },
          ]);
        });
      const conversation = {
        id: testConversationIds[0],
      };
      await resolver.unreadMessageCount(conversation, authenticatedUser);

      expect(logicSpy).toBeCalledWith({
        userId: authenticatedUser.userId.toHexString(),
        conversationIds: [testConversationIds[0]],
      });
    });

    it('Call dataloader to get last messages', async () => {
      const testMessageId = new ObjectID();
      const logicSpy = jest
        .spyOn(messageDataLoader, 'load')
        .mockImplementationOnce(() => {
          return Promise.resolve({
            id: testMessageId,
            text: 'message 1',
            created: new Date('2022-12-31'),
            sender: { id: '123' },
            deleted: false,
            resolved: false,
            likes: [],
            likesCount: 0,
          });
        });
      const conversation: ConversationDTO = {
        id: testConversationIds[0],
        lastMessageId: testMessageId,
        permissions: [],
        product: Product.community,
        context: [],
        memberIds: [],
        blockedMemberIds: [],
      };
      const lastMessage = await resolver.lastMessage(conversation);

      expect(logicSpy).toBeCalledWith(testMessageId);
      expect(lastMessage).toEqual({
        id: testMessageId,
        text: 'message 1',
        created: new Date('2022-12-31'),
        sender: { id: '123' },
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
      });
    });

    it('Call logic layer to resolve recordLastMessageReadByUser', async () => {
      const obj = {
        conversationId: testConversationIds[0],
        messageId: testMessageId,
        authenticatedUser,
      };
      const returnObj = {
        conversationId: testConversationIds[0],
        messageId: testMessageId,
        userId: testMemberId,
      };
      const logicSpy = jest
        .spyOn(conversationLogic, 'recordLastMessageReadByUser')
        .mockImplementationOnce(() => {
          return Promise.resolve(returnObj);
        });
      await resolver.recordLastMessageReadByUser(
        {
          conversationId: testConversationIds[0],
          messageId: testMessageId,
        },
        authenticatedUser,
      );

      expect(logicSpy).toBeCalledWith(obj);
    });
  });
});
