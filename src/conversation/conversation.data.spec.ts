import { Model } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { ObjectID } from 'mongodb';
import { Test, TestingModule } from '@nestjs/testing';

import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { ConversationCacheManagerService } from '../cache-manager/conversation-cache-manager.service';

import { ConversationData } from './conversation.data';
import { ChatConversation } from './models/ChatConversation.entity';
import {
  ChatConversationModel,
  ChatConversationDocument,
  ChatConversationSchema,
  chatConversationToObject,
} from './models/conversation.model';
import { LastReadModel, LastReadSchema } from './models/lastRead.model';
import { CreateChatConversationDto } from './models/CreateChatConversation.dto';
import { Permission } from './models/Permission.dto';

import {
  ContextSchema,
  ContextType,
  Product,
} from './models/ContextSchema.dto';
import { Action, Subject } from '../permissions/models/permissions.model';
import { AddMemberDTO } from './models/AddMember.dto';
import { UnreadCountInput } from './models/unreadCount.dto';
import { LastMessageInput } from './models/lastMessage.dto';
import { MessageData } from '../message/message.data';
import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { ConfigurationManager } from '../configuration/configuration-manager';

class CacheMock {
  get() {
    return;
  }
  set() {
    return;
  }
  del() {
    return;
  }
}

class MessageDataMock {
  getMessages() {
    return;
  }
}

const createConversation = async (
  conversationData: ConversationData,
  testId: string,
  product: Product = Product.community,
  permissions: Permission[] = [
    {
      action: Action.readConversation,
      subject: Subject.user,
      conditions: { userId: { $in: 'conversation.universityids' } },
    },
  ],
): Promise<ChatConversation> => {
  const testConversation: CreateChatConversationDto = {
    product,
    permissions,
    context: [
      {
        type: ContextType.university,
        id: testId,
      },
    ],
  };

  return await conversationData.create(testConversation);
};

describe('ConversationData', () => {
  let conversationData: ConversationData;
  let chatConversationModel: Model<ChatConversationDocument>;
  let conversationCache: ConversationCacheManagerService;
  let messageData: MessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          inject: [ConfigurationManager],
          useFactory: (configurationManager: ConfigurationManager) => {
            const databaseConfig =
              configurationManager.getConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatConversationModel.name, schema: ChatConversationSchema },
          { name: LastReadModel.name, schema: LastReadSchema },
        ]),
      ],
      providers: [
        ConversationData,
        {
          provide: ConversationCacheManagerService,
          useClass: CacheMock,
        },
        {
          provide: MessageData,
          useClass: MessageDataMock,
        },
      ],
    }).compile();

    conversationData = module.get<ConversationData>(ConversationData);
    chatConversationModel = module.get<Model<ChatConversationDocument>>(
      `${ChatConversationModel.name}Model`,
    );
    conversationCache = module.get<ConversationCacheManagerService>(
      ConversationCacheManagerService,
    );
    messageData = module.get<MessageData>(MessageData);
  });

  it('should be defined', () => {
    expect(conversationData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(conversationData.create).toBeDefined();
    });
    it('saves a valid conversation', async () => {
      const testConversation: CreateChatConversationDto = {
        product: Product.community,
        permissions: [
          {
            action: Action.readConversation,
            subject: Subject.user,
            conditions: { userId: { $in: 'conversation.universityids' } },
          },
        ],
        context: [
          {
            type: ContextType.university,
            id: '123',
          },
        ],
      };

      const result = await conversationData.create(testConversation);
      expect(result).toEqual(expect.objectContaining(testConversation));
    });

    it('create news feed context type conversation with memberIds and blockedMemberIds', async () => {
      const testConversation: CreateChatConversationDto = {
        product: Product.community,
        permissions: [
          {
            action: Action.readConversation,
            subject: Subject.user,
            conditions: { userId: { $in: 'conversation.universityids' } },
          },
        ],
        context: [
          {
            type: ContextType.isNewsFeedConversation,
            id: '123',
          },
        ],

        memberIds: ['1124', '1125', '1126'],
        blockedMemberIds: ['1126'],
      };

      const result = await conversationData.create(testConversation);
      expect(result).toEqual(expect.objectContaining(testConversation));
    });
  });

  describe('getConversation', () => {
    it('should be defined', () => {
      expect(conversationData.getConversation).toBeDefined();
    });

    describe('valid conversation', () => {
      const testConversation = {
        product: 'community',
        permissions: [{ action: 'readConversation', subject: 'User' }],
        context: [
          {
            type: 'university',
            id: '123',
          },
        ],
      };

      let conversation: ChatConversationModel;
      let cacheGetSpy: jest.SpyInstance;
      let cacheSetSpy: jest.SpyInstance;
      let conversationId: string;

      beforeAll(async () => {
        const data = new chatConversationModel(testConversation);
        ({ id: conversationId } = chatConversationToObject(await data.save()));

        const mockConversation: ChatConversationModel = {
          id: conversationId,
          permissions: [
            { action: Action.readConversation, subject: Subject.user },
          ],
          product: Product.community,
          context: [
            {
              type: ContextType.university,
              id: '123',
            },
          ],
          memberIds: [],
          blockedMemberIds: [],
          lastMessageId: new ObjectID('321b1a570ff321b1a570ff01'),
        };

        cacheGetSpy = jest.spyOn(conversationCache, 'get');
        cacheSetSpy = jest.spyOn(conversationCache, 'set');
        conversation = await conversationData.getConversation(conversationId);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('checks the cache', () => {
        expect(cacheGetSpy).toBeCalledWith(conversationId);
      });

      it('returns the conversation if the id is valid', async () => {
        expect(conversation).toEqual(expect.objectContaining(testConversation));
      });

      it('adds the conversation to the cache', () => {
        expect(cacheSetSpy).toBeCalledWith(conversation, conversationId);
      });
    });

    describe('valid conversation in cache', () => {
      const testConversation = {
        product: 'community',
        permissions: [{ action: 'readConversation', subject: 'Conversation' }],
        context: [
          {
            type: 'university',
            id: '123',
          },
        ],
      };

      let conversation: ChatConversationModel;
      let cacheGetSpy: jest.SpyInstance;
      let cacheSetSpy: jest.SpyInstance;
      let conversationId: string;
      let findByIdSpy: jest.SpyInstance;

      beforeAll(async () => {
        const data = new chatConversationModel(testConversation);
        const savedConversation = chatConversationToObject(await data.save());
        conversationId = savedConversation.id;
        cacheGetSpy = jest
          .spyOn(conversationCache, 'get')
          .mockImplementationOnce(() => {
            return Promise.resolve(savedConversation);
          });
        findByIdSpy = jest.spyOn(chatConversationModel, 'findById');
        cacheSetSpy = jest.spyOn(conversationCache, 'set');
        conversation = await conversationData.getConversation(conversationId);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('checks the cache', () => {
        expect(cacheGetSpy).toBeCalledWith(conversationId);
      });

      it('returns the conversation if the id is valid', () => {
        expect(conversation).toEqual(expect.objectContaining(testConversation));
      });

      it('does not call the database', () => {
        expect(findByIdSpy).not.toBeCalled();
      });

      it('does not update the cache', () => {
        expect(cacheSetSpy).not.toBeCalled();
      });
    });
  });

  describe('get conversations for inbox', () => {
    const userId = '321b1a570ff321b1a570ff01';
    const context: ContextSchema = {
      id: `${new ObjectID()}`,
      type: ContextType.university,
    };
    const testConversation: ChatConversationModel = {
      id: 'will-be-overwritten',
      permissions: [],
      product: Product.community,
      context: [context],
      memberIds: [userId],
      blockedMemberIds: [],
      lastMessageId: new ObjectID('321b1a570ff321b1a570ff04'),
    };
    let savedConversation: ChatConversationModel;

    beforeAll(async () => {
      const data = new chatConversationModel(testConversation);
      savedConversation = chatConversationToObject(await data.save());
    });

    it('Gets conversations', async () => {
      const result = await conversationData.getConversationsForInbox(userId, [
        context,
      ]);

      expect(result.length).toEqual(1);
      expect(result[0].id).toEqual(savedConversation.id);
    });

    it('Does not get conversations if user not in members array', async () => {
      const result = await conversationData.getConversationsForInbox(
        '321b1a570ff321b1a570ff05',
        [context],
      );

      expect(result.length).toEqual(0);
    });

    it('Does not get conversations if contexts do not match', async () => {
      const result = await conversationData.getConversationsForInbox(userId, [
        {
          id: '321b1a570ff321b1a570ff05',
          type: ContextType.university,
        },
      ]);

      expect(result.length).toEqual(0);
    });
  });

  describe('no conversation with the conversationId', () => {
    const unknownConversationId = '321b1a570ff321b1a570f404';

    let cacheGetSpy: jest.SpyInstance;
    let cacheSetSpy: jest.SpyInstance;
    let findByIdSpy: jest.SpyInstance;

    beforeAll(async () => {
      cacheGetSpy = jest.spyOn(conversationCache, 'get');
      findByIdSpy = jest.spyOn(chatConversationModel, 'findById');
      cacheSetSpy = jest.spyOn(conversationCache, 'set');
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('gets from cache, calls the db, and throws error', async () => {
      await expect(
        conversationData.getConversation(unknownConversationId),
      ).rejects.toEqual(new Error('Could not find conversation'));
      expect(cacheGetSpy).toBeCalledWith(unknownConversationId);
      expect(findByIdSpy).toBeCalledWith(unknownConversationId);
      expect(cacheSetSpy).not.toBeCalled();
    });
  });

  describe('addmember', () => {
    it('should be defined', () => {
      expect(conversationData.addMember).toBeDefined();
    });

    it('returns the returns the update conversation with the new member', async () => {
      const testConversation = {
        product: 'community',
        permissions: [{ action: 'readConversation', subject: 'Conversation' }],
        context: [
          {
            type: 'university',
            id: '123',
          },
        ],
      };
      const data = new chatConversationModel(testConversation);
      const { id } = chatConversationToObject(await data.save());
      const addMember: AddMemberDTO = {
        userId: '1234',
      };
      const cacheSetSpy = jest.spyOn(conversationCache, 'set');

      const conversation = await conversationData.addMember(id, addMember);

      expect(cacheSetSpy).toBeCalledWith(conversation, id);

      expect(conversation).toEqual(
        expect.objectContaining({
          ...testConversation,
          memberIds: [addMember.userId],
        }),
      );
    });
  });

  describe('removeMember', () => {
    it('should be defined', () => {
      expect(conversationData.removeMember).toBeDefined();
    });

    it('returns the returns the updated conversation without the removed member', async () => {
      const memberToRemove = 'removeMePlease';
      const memberToKeep = 'leaveMePlease';
      const testConversation = {
        product: 'community',
        permissions: [{ action: 'readConversation', subject: 'Conversation' }],
        context: [
          {
            type: 'university',
            id: '123',
          },
        ],
        memberIds: [memberToRemove, memberToKeep],
      };

      const data = new chatConversationModel(testConversation);
      const { id } = chatConversationToObject(await data.save());
      const cacheSetSpy = jest.spyOn(conversationCache, 'set');

      const conversation = await conversationData.removeMember(
        id,
        memberToRemove,
      );

      expect(cacheSetSpy).toBeCalledWith(conversation, id);

      expect(conversation).toEqual(
        expect.objectContaining({
          ...testConversation,
          memberIds: [memberToKeep],
        }),
      );
    });
  });

  describe('blockMember', () => {
    it('should be defined', () => {
      expect(conversationData.blockMember).toBeDefined();
    });

    let conversation1: ChatConversation;
    let conversation2: ChatConversation;
    const userId1 = '5fe0cce861c8ea54018385af';
    const userId2 = '5fe0cce861c8ea54018385ag';

    beforeAll(async () => {
      conversation1 = await createConversation(conversationData, '123');
      conversation2 = await createConversation(conversationData, '456');
      await conversationData.addMember(conversation1.id, { userId: userId1 });
      await conversationData.addMember(conversation1.id, { userId: userId2 });
      await conversationData.addMember(conversation2.id, { userId: userId1 });
      await conversationData.addMember(conversation2.id, { userId: userId2 });
    });

    it('successfully blocks the user', async () => {
      await conversationData.blockMember(
        [conversation1.id, conversation2.id],
        userId1,
      );
      const updatedConversation1 = await conversationData.getConversation(
        conversation1.id,
      );
      const updatedConversation2 = await conversationData.getConversation(
        conversation2.id,
      );
      expect(updatedConversation1.blockedMemberIds).toContain(userId1);
      expect(updatedConversation2.blockedMemberIds).toContain(userId1);
    });

    it('successfully unblocks the user', async () => {
      await conversationData.unblockMember(
        [conversation1.id, conversation2.id],
        userId1,
      );
      const updatedConversation1 = await conversationData.getConversation(
        conversation1.id,
      );
      const updatedConversation2 = await conversationData.getConversation(
        conversation2.id,
      );
      expect(updatedConversation1.blockedMemberIds).not.toContain(userId1);
      expect(updatedConversation2.blockedMemberIds).not.toContain(userId1);
    });
  });

  describe('Migrate Permissions', () => {
    let communityConversation1: ChatConversation;
    let communityConversation2: ChatConversation;
    let eventsConversation1: ChatConversation;
    let eventsConversation2: ChatConversation;
    let newPermissions: Permission[];
    let cacheDelSpy: jest.SpyInstance;

    beforeAll(async () => {
      communityConversation1 = await createConversation(
        conversationData,
        '123',
      );
      communityConversation2 = await createConversation(
        conversationData,
        '456',
      );
      eventsConversation1 = await createConversation(
        conversationData,
        '123',
        Product.virtualEvent,
      );
      eventsConversation2 = await createConversation(
        conversationData,
        '456',
        Product.virtualEvent,
      );
      newPermissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $in: 'conversation.universityids' } },
        },
        {
          action: Action.sendMessage,
          subject: Subject.user,
          conditions: {
            userId: {
              $in: 'conversation.universityids',
            },
          },
        },
      ];
      cacheDelSpy = jest.spyOn(conversationCache, 'del');
      await conversationData.migratePermissions(
        newPermissions,
        Product.community,
        [communityConversation1.id],
      );
    });

    it('updates permissions for only community, and as per given conversationId not for the other conversationId', async () => {
      const conversations = [communityConversation1, communityConversation2];
      for (const conversation of conversations) {
        const conversationDetail = await conversationData.getConversation(
          conversation.id,
        );
        conversation.id === communityConversation1.id
          ? expect(conversationDetail.permissions).toEqual(newPermissions)
          : expect(conversationDetail.permissions).not.toEqual(newPermissions);
      }
    });

    it('does not update permissions of the liveEvents conversations', async () => {
      const conversations = [eventsConversation1, eventsConversation2];
      for (const conversation of conversations) {
        const conversationDetail = await conversationData.getConversation(
          conversation.id,
        );
        expect(conversationDetail.permissions).not.toEqual(newPermissions);
      }
    });

    it('deletes cache of affected communityConversations', () => {
      expect(cacheDelSpy).toBeCalledWith(communityConversation1.id);
      expect(cacheDelSpy).not.toBeCalledWith(communityConversation2.id);
      expect(cacheDelSpy).not.toBeCalledWith(eventsConversation1.id);
      expect(cacheDelSpy).not.toBeCalledWith(eventsConversation2.id);
    });
  });

  describe('Unread Messages', () => {
    let conversation1: ChatConversation;
    let conversation2: ChatConversation;
    let conversation3: ChatConversation;
    const userId1 = new ObjectID().toHexString();
    const lastMessageId1 = new ObjectID('507f191e810c19729de860ea');
    const lastMessageId1New = new ObjectID('607f191e810c19729de860ea');
    const secondLatestMessageId = new ObjectID();
    const authenticatedUser: IAuthenticatedUser = {
      userId: new ObjectID(userId1),
      accountRole: 'applicant',
      universityId: new ObjectID(),
    };

    beforeAll(async () => {
      const universityId = new ObjectID().toHexString();
      conversation1 = await createConversation(conversationData, universityId);
      conversation2 = await createConversation(conversationData, universityId);
      conversation3 = await createConversation(conversationData, universityId);
      await conversationData.addMember(conversation1.id, { userId: userId1 });
      await conversationData.addMember(conversation2.id, { userId: userId1 });
      await conversationData.addMember(conversation3.id, { userId: userId1 });
    });

    it('should be defined', () => {
      expect(conversationData.updateConversationWithLastMessage).toBeDefined();
      expect(conversationData.recordLastMessageReadByUser).toBeDefined();
      expect(conversationData.getUnreadMessageCounts).toBeDefined();
    });

    describe('before any state changes', () => {
      it('updates a conversations last message', async () => {
        await conversationData.updateConversationWithLastMessage(
          conversation1.id,
          lastMessageId1,
        );
        await conversationData.updateConversationWithLastMessage(
          conversation2.id,
          secondLatestMessageId,
        );
        const firstConversation = await conversationData.getConversation(
          conversation1.id,
        );
        const secondConversation = await conversationData.getConversation(
          conversation2.id,
        );
        const thirdConversation = await conversationData.getConversation(
          conversation3.id,
        );
        expect(firstConversation.lastMessageId).toEqual(lastMessageId1);
        expect(secondConversation.lastMessageId).toEqual(secondLatestMessageId);
        expect(thirdConversation.lastMessageId).toEqual(undefined);
      });
    });

    it('does not update lastMessageId if new messageId is lesser in value', async () => {
      await conversationData.updateConversationWithLastMessage(
        conversation1.id,
        new ObjectID('407f191e810c19729de860ea'),
      );
      const firstConversation = await conversationData.getConversation(
        conversation1.id,
      );
      expect(firstConversation.lastMessageId).toEqual(lastMessageId1);
    });

    it('does update lastMessageId if new messageId is greater in value', async () => {
      await conversationData.updateConversationWithLastMessage(
        conversation1.id,
        lastMessageId1New,
      );
      const firstConversation = await conversationData.getConversation(
        conversation1.id,
      );
      expect(firstConversation.lastMessageId).toEqual(lastMessageId1New);
    });

    describe('before any read', () => {
      it('get unread messages count in each conversation', async () => {
        const expectedObj = new Map<string, number>();
        expectedObj.set(conversation1.id, 1);
        expectedObj.set(conversation2.id, 1);
        expectedObj.set(conversation3.id, 0);
        [conversation1.id, conversation2.id].forEach(async (convId) => {
          const unreadCount =
            await conversationData.getUnreadCountInConversation(
              userId1,
              convId,
            );
          expect(unreadCount).toEqual(expectedObj.get(convId));
        });
      });
    });

    describe('user reads conv1', () => {
      it('records last message read by user in first conversation', async () => {
        const lastRead = await conversationData.recordLastMessageReadByUser({
          conversationId: conversation1.id,
          messageId: lastMessageId1New,
          authenticatedUser,
        });
        expect(lastRead).toEqual(
          expect.objectContaining({
            userId: userId1,
            conversationId: conversation1.id,
            messageId: lastMessageId1New,
            createdAt: expect.anything(),
          }),
        );
      });
    });

    describe('after user has read conv1', () => {
      it('get unread messages count in first conversation', async () => {
        const unreadCount = await conversationData.getUnreadCountInConversation(
          userId1,
          conversation1.id,
        );
        expect(unreadCount).toEqual(0);
      });

      it('records non-last message read by user in second conversation', async () => {
        const lastMessageId1New = new ObjectID();
        const lastRead = await conversationData.recordLastMessageReadByUser({
          conversationId: conversation2.id,
          messageId: lastMessageId1New,
          authenticatedUser,
        });
        expect(lastRead).toEqual(
          expect.objectContaining({
            userId: userId1,
            conversationId: conversation2.id,
            messageId: lastMessageId1New,
            createdAt: expect.anything(),
          }),
        );
      });
    });

    describe('user has read non-last message in conv2', () => {
      it('get unread messages count in conv2', async () => {
        const unreadCount = await conversationData.getUnreadCountInConversation(
          userId1,
          conversation2.id,
        );
        expect(unreadCount).toEqual(1);
      });

      it('records last message read by user in third conversation', async () => {
        const lastMessageId1New = new ObjectID();
        const lastRead = await conversationData.recordLastMessageReadByUser({
          conversationId: conversation3.id,
          messageId: lastMessageId1New,
          authenticatedUser,
        });
        expect(lastRead).toEqual(
          expect.objectContaining({
            userId: userId1,
            conversationId: conversation3.id,
            messageId: lastMessageId1New,
            createdAt: expect.anything(),
          }),
        );
      });
    });

    describe('user has read conv3', () => {
      it('get unread messages count in conv3', async () => {
        const unreadCount = await conversationData.getUnreadCountInConversation(
          userId1,
          conversation3.id,
        );
        expect(unreadCount).toEqual(0);
      });
      it('get unread messages count across conversations', async () => {
        const unreadCountInput: UnreadCountInput = {
          conversationIds: [
            conversation1.id,
            conversation2.id,
            conversation3.id,
          ],
          userId: userId1,
        };
        const unreadCounts = await conversationData.getUnreadMessageCounts(
          unreadCountInput,
        );
        const expected = [
          { id: conversation1.id, unreadMessageCount: 0 },
          { id: conversation2.id, unreadMessageCount: 1 },
          { id: conversation3.id, unreadMessageCount: 0 },
        ];
        expect(unreadCounts).toEqual(expected);
      });
    });

    describe('first pass done', () => {
      it('successfully updates conv2 in the second pass with latest message', async () => {
        const lastRead = await conversationData.recordLastMessageReadByUser({
          conversationId: conversation2.id,
          messageId: secondLatestMessageId,
          authenticatedUser,
        });
        expect(lastRead).toEqual(
          expect.objectContaining({
            userId: userId1,
            conversationId: conversation2.id,
            messageId: secondLatestMessageId,
          }),
        );
      });
    });

    describe('check after second pass', () => {
      it('get unread messages count in each conversation', async () => {
        const expectedObj = new Map<string, number>();
        expectedObj.set(conversation1.id, 0);
        expectedObj.set(conversation2.id, 0);
        expectedObj.set(conversation3.id, 0);
        [conversation1.id, conversation2.id].forEach(async (convId) => {
          const unreadCount =
            await conversationData.getUnreadCountInConversation(
              userId1,
              convId,
            );
          expect(unreadCount).toEqual(expectedObj.get(convId));
        });
      });
      it('get unread messages count across conversations', async () => {
        const unreadCountInput: UnreadCountInput = {
          conversationIds: [
            conversation1.id,
            conversation2.id,
            conversation3.id,
          ],
          userId: userId1,
        };
        const unreadCounts = await conversationData.getUnreadMessageCounts(
          unreadCountInput,
        );
        const expected = [
          { id: conversation1.id, unreadMessageCount: 0 },
          { id: conversation2.id, unreadMessageCount: 0 },
          { id: conversation3.id, unreadMessageCount: 0 },
        ];
        expect(unreadCounts).toEqual(expected);
      });
      it('get lastMessages across conversations', async () => {
        jest.spyOn(messageData, 'getMessages').mockImplementation(() =>
          Promise.resolve([
            {
              id: lastMessageId1New,
              text: 'Message 1',
              created: new Date(),
              sender: { id: '5678' },
              likesCount: 1,
              deleted: false,
              likes: [],
              resolved: false,
            },
            {
              id: secondLatestMessageId,
              text: 'Message 2',
              created: new Date(),
              sender: { id: '1234' },
              likesCount: 1,
              deleted: false,
              likes: [],
              resolved: false,
            },
          ]),
        );
        const lastMessageInput: LastMessageInput = {
          conversationIds: [
            conversation1.id,
            conversation2.id,
            conversation3.id,
          ],
          userId: userId1,
        };
        const lastMessageOutputs = await conversationData.getLastMessages(
          lastMessageInput,
        );
        expect(lastMessageOutputs).toEqual([
          {
            id: conversation1.id,
            lastMessage: expect.objectContaining({ id: lastMessageId1New }),
          },
          {
            id: conversation2.id,
            lastMessage: expect.objectContaining({ id: secondLatestMessageId }),
          },
          { id: conversation3.id, lastMessage: undefined },
        ]);
      });
    });
  });

  describe('pinMessages', () => {
    it('should update pinnedMessages field when adding messages', async () => {
      const messageId = new ObjectID();
      const pinnedMessages = [new ObjectID(), new ObjectID()];
      const testConversation = {
        product: 'community',
        permissions: [{ action: 'readConversation', subject: 'Conversation' }],
        context: [
          {
            type: 'university',
            id: '123',
          },
        ],
        pinnedMessages: pinnedMessages,
      };

      const data = new chatConversationModel(testConversation);
      const { id } = chatConversationToObject(await data.save());
      const cacheSetSpy = jest.spyOn(conversationCache, 'set');

      const conversation = await conversationData.pinMessage(id, messageId);

      expect(cacheSetSpy).toBeCalledWith(conversation, id);

      expect(conversation).toEqual(
        expect.objectContaining({
          ...testConversation,
          pinnedMessages: [...pinnedMessages, messageId],
        }),
      );
    });

    it('should update pinnedMessages field when removing messages', async () => {
      const pinnedMessages = [new ObjectID(), new ObjectID()];
      const messageId = pinnedMessages[1];
      const testConversation = {
        product: 'community',
        permissions: [{ action: 'readConversation', subject: 'Conversation' }],
        context: [
          {
            type: 'university',
            id: '123',
          },
        ],
        pinnedMessages: pinnedMessages,
      };

      const data = new chatConversationModel(testConversation);
      const { id } = chatConversationToObject(await data.save());
      const cacheSetSpy = jest.spyOn(conversationCache, 'set');

      const conversation = await conversationData.unpinMessage(id, messageId);

      expect(cacheSetSpy).toBeCalledWith(conversation, id);

      expect(conversation).toEqual(
        expect.objectContaining({
          ...testConversation,
          pinnedMessages: [pinnedMessages[0]],
        }),
      );
    });
  });

  it('create Chat Conversation', async () => {
    const testDirectConversation: ChatConversationModel = {
      id: new ObjectID().toHexString(),
      blockedMemberIds: [],
      lastMessageId: new ObjectID(),
      product: Product.community,
      permissions: [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $in: 'conversation.universityids' } },
        },
      ],
      context: [new ContextSchema(true, ContextType.isDirectConversation)],
      memberIds: [new ObjectID().toHexString(), new ObjectID().toHexString()],
    };

    const result = await conversationData.createChatConversation(
      testDirectConversation,
    );
    testDirectConversation.id = result.id;
    expect(result).toEqual(expect.objectContaining(testDirectConversation));
  });

  it('Get Conversation By All MemberIds And Context', async () => {
    const testDirectConversation: ChatConversationModel = {
      id: new ObjectID().toHexString(),
      blockedMemberIds: [],
      lastMessageId: new ObjectID(),
      product: Product.community,
      permissions: [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $in: 'conversation.universityids' } },
        },
      ],
      context: [new ContextSchema(true, ContextType.isDirectConversation)],
      memberIds: [new ObjectID().toHexString(), new ObjectID().toHexString()],
    };

    const result = await conversationData.createChatConversation(
      testDirectConversation,
    );

    const resultOfGet =
      await conversationData.getConversationByAllMemberIdsAndContext(
        testDirectConversation.memberIds,
        testDirectConversation.context,
      );
    expect(result.id).toEqual(resultOfGet?.id);
  });
});
