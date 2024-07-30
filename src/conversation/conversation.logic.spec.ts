import { UserBlocksLogic } from './../user-blocks/user-blocks.logic';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { ForbiddenError, UserInputError } from 'apollo-server-errors';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import {
  ChatConversationModel,
  ChatConversationDocument,
} from './models/conversation.model';
import {
  Context,
  ContextSchema,
  ContextType,
  Product,
} from './models/ContextSchema.dto';
import { ConversationLogic } from './conversation.logic';
import { ConversationData, IConversationData } from './conversation.data';
import { PermissionsService } from '../permissions/permissions.service';
import { Action, Subject } from '../permissions/models/permissions.model';
import { MessageLogic } from '../message/message.logic';
import { ConversationChannel } from './conversation-channel.socket';
import { SafeguardingService } from '../safeguarding/safeguarding.service';
import { UserService } from '../user/user.service';
import { BaseEventType } from '../sockets/sockets.service';
import {
  CreateChatConversationDto,
  Tag,
  TagType,
} from './models/CreateChatConversation.dto';
import { FilterQuery } from 'mongoose';
import { AddMemberDTO } from './models/AddMember.dto';
import { LastMessageInput, LastMessageOutput } from './models/lastMessage.dto';
import { LastRead } from './models/LastRead.entity';
import { LastReadInput } from './models/LastReadInput.dto';
import { Permission } from './models/Permission.dto';
import { UnreadCountInput, UnreadCountOutput } from './models/unreadCount.dto';
import { DirectChatConversationDto } from './dto/DirectChatConversationDto';
import {
  MessageGroupedByConversationOutput,
  MessagesFilterInput,
} from './models/messagesFilterInput';

class MockedConversationData implements IConversationData {
  addMember(
    conversationId: string,
    addMember: AddMemberDTO,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  removeMember(
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  blockMember(conversationIds: string[], memberId: string): Promise<void> {
    throw new Error('Method not implemented');
  }
  unblockMember(conversationIds: string[], memberId: string): Promise<void> {
    throw new Error('Method not implemented');
  }
  create(data: CreateChatConversationDto): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  updateTags(
    conversationId: string,
    tags: Tag[],
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  getConversation(conversationId: string): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  getConversationsForInbox(
    userId: string,
    contexts: ContextSchema[],
  ): Promise<ChatConversationModel[]> {
    throw new Error('Method not implemented');
  }
  listConversationIds(
    query: FilterQuery<ChatConversationDocument>,
  ): Promise<string[]> {
    throw new Error('Method not implemented');
  }
  migratePermissions(
    chatPermissionsDto: Permission[],
    product: Product,
    conversationIds: string[],
  ): Promise<void> {
    throw new Error('Method not implemented');
  }
  updateConversationWithLastMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  getLastRead(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<LastRead> {
    throw new Error('Method not implemented');
  }
  recordLastMessageReadByUser({
    conversationId,
    messageId,
    authenticatedUser,
  }: LastReadInput): Promise<LastRead> {
    throw new Error('Method not implemented');
  }
  getUnreadMessageCounts({
    userId,
    conversationIds,
  }: UnreadCountInput): Promise<UnreadCountOutput[]> {
    throw new Error('Method not implemented');
  }
  getUnreadCountInConversation(
    userId: string,
    conversationId: string,
  ): Promise<number> {
    throw new Error('Method not implemented');
  }
  getLastMessages({
    userId,
    conversationIds,
  }: LastMessageInput): Promise<LastMessageOutput[]> {
    throw new Error('Method not implemented');
  }
  pinMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }
  unpinMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented');
  }

  getConversationByAllMemberIdsAndContext() {
    return;
  }

  createChatConversation() {
    return;
  }
}

class MockedPermissionsService {
  conversationPermissions() {
    return true;
  }
}

class MockMessageLogic {
  getMessage(messageId: string, authenticatedUser: IAuthenticatedUser) {
    return {
      id: new ObjectID(messageId),
      senderId: new ObjectID('321b1a570ff321b1a570ff01'),
      text: 'hello',
      created: new Date(),
      deleted: false,
      likes: [],
      likesCount: 0,
      resolved: false,
    };
  }
  sendPinMessageEvent() {
    return Promise.resolve();
  }
  sendUnpinMessageEvent() {
    return Promise.resolve();
  }
  getMessagesByConversation() {
    return Promise.resolve();
  }
}

class MockConversationChannel {
  send(event: BaseEventType, channelId: string) {
    void 0;
  }
}

class MockSafeguardingService {
  clean(text: string) {
    return text;
  }
}

class MockUserService {
  getUser(user: string) {
    return {
      id: new ObjectID(user),
      firstName: 'Bubbles',
      profilePhoto: 'my-pic',
      accountRole: 'university',
    };
  }
}

class MockUserBlocksLogic {
  userToUserBlockingExists() {
    return false;
  }
}

describe('ConversationLogic', () => {
  let service: ConversationLogic;
  let permissionsService: PermissionsService;
  let conversationData: ConversationData;
  let conversationChannel: ConversationChannel;
  let userBlocksLogic: UserBlocksLogic;
  let messageLogic: MessageLogic;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationLogic,
        { provide: ConversationData, useClass: MockedConversationData },
        { provide: PermissionsService, useClass: MockedPermissionsService },
        { provide: MessageLogic, useClass: MockMessageLogic },
        { provide: ConversationChannel, useClass: MockConversationChannel },
        { provide: SafeguardingService, useClass: MockSafeguardingService },
        { provide: UserService, useClass: MockUserService },
        { provide: UserBlocksLogic, useClass: MockUserBlocksLogic },
      ],
    }).compile();

    service = module.get<ConversationLogic>(ConversationLogic);
    permissionsService = module.get<PermissionsService>(PermissionsService);
    conversationData = module.get<ConversationData>(ConversationData);
    conversationChannel = module.get<ConversationChannel>(ConversationChannel);
    userBlocksLogic = module.get<UserBlocksLogic>(UserBlocksLogic);
    messageLogic = module.get<MessageLogic>(MessageLogic);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConversation', () => {
    it('should be defined', () => {
      expect(service.getConversation).toBeDefined();
    });

    it('should throw an error if the user is not authorised to view the conversation', async () => {
      jest
        .spyOn(permissionsService, 'conversationPermissions')
        .mockImplementationOnce(() => {
          return Promise.resolve(false);
        });

      await expect(
        service.getConversation('1234', {
          userId: new ObjectID(),
          accountRole: 'applicant',
        }),
      ).rejects.toEqual(
        new ForbiddenError('User is not authorised to view this conversation'),
      );
    });
    ChatConversationModel;
    it('should call get ConversationData for an authorised user ', async () => {
      const testConversationId = '1234';
      const mockConversation: ChatConversationModel = {
        id: testConversationId,
        product: Product.community,
        context: [],
        memberIds: [],
        permissions: [],
        blockedMemberIds: [],
        lastMessageId: new ObjectID(),
        pinnedMessages: [],
      };
      jest
        .spyOn(conversationData, 'getConversation')
        .mockImplementationOnce(() => {
          return Promise.resolve(mockConversation);
        });

      await expect(
        service.getConversation(testConversationId, {
          userId: new ObjectID(),
          accountRole: 'applicant',
        }),
      ).resolves.toEqual(mockConversation);
    });
  });

  describe('blockMember', () => {
    const testConversationIds = ['conversation001', 'conversation002'];
    const testMemberId = 'member001';
    it('should be defined', () => {
      expect(service.blockMember).toBeDefined();
      expect(service.unblockMember).toBeDefined();
    });

    it('Call data layer to block member', async () => {
      const dataSpy = jest
        .spyOn(conversationData, 'blockMember')
        .mockImplementationOnce(() => {
          return Promise.resolve();
        });
      await service.blockMember(testConversationIds, testMemberId);

      expect(dataSpy).toBeCalledWith(testConversationIds, testMemberId);
    });

    it('Call data layer to unblock member', async () => {
      const dataSpy = jest
        .spyOn(conversationData, 'unblockMember')
        .mockImplementationOnce(() => {
          return Promise.resolve();
        });
      await service.unblockMember(testConversationIds, testMemberId);

      expect(dataSpy).toBeCalledWith(testConversationIds, testMemberId);
    });
  });

  describe('Migrate Permissions', () => {
    const newPermissions: Permission[] = [
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

    it('is defined', () => {
      expect(service.migratePermissions).toBeDefined();
    });

    it('calls data layer with supplied parameters', async () => {
      const fakeConversationIds = ['someId'];
      const dataSpy = jest
        .spyOn(conversationData, 'migratePermissions')
        .mockImplementationOnce(() => {
          return Promise.resolve();
        });
      await service.migratePermissions(
        newPermissions,
        Product.community,
        fakeConversationIds,
      );
      expect(dataSpy).toBeCalledWith(
        newPermissions,
        Product.community,
        fakeConversationIds,
      );
    });
  });

  describe('Unread Messages', () => {
    const testConversationIds = ['conversation001', 'conversation002'];
    const testUserObjectId = new ObjectID();
    const testMemberId = testUserObjectId.toHexString();
    const authenticatedUser: IAuthenticatedUser = {
      userId: testUserObjectId,
      accountRole: 'applicant',
      universityId: new ObjectID(),
    };
    const testMessageId = new ObjectID();
    it('should be defined', () => {
      expect(service.recordLastMessageReadByUser).toBeDefined();
      expect(service.getUnreadMessageCounts).toBeDefined();
    });

    it('Call data layer to record Last Message by User', async () => {
      const obj = {
        conversationId: testConversationIds[0],
        messageId: testMessageId,
        authenticatedUser,
      };
      const dataSpy = jest
        .spyOn(conversationData, 'recordLastMessageReadByUser')
        .mockImplementationOnce(() => {
          return Promise.resolve({
            conversationId: testConversationIds[0],
            messageId: testMessageId,
            userId: authenticatedUser.userId.toHexString(),
          });
        });
      await service.recordLastMessageReadByUser(obj);

      expect(dataSpy).toBeCalledWith(obj);
    });

    it('Call data layer to get unread message counts', async () => {
      const dataSpy = jest
        .spyOn(conversationData, 'getUnreadMessageCounts')
        .mockImplementationOnce(() => {
          return Promise.resolve([]);
        });
      const obj = {
        userId: testMemberId,
        conversationIds: testConversationIds,
      };
      await service.getUnreadMessageCounts(obj);

      expect(dataSpy).toBeCalledWith(obj);
    });

    it('Call data layer to get lastMessages', async () => {
      const dataSpy = jest
        .spyOn(conversationData, 'getLastMessages')
        .mockImplementationOnce(() => {
          return Promise.resolve([]);
        });
      const obj = {
        userId: testMemberId,
        conversationIds: testConversationIds,
      };
      await service.getLastMessages(obj);

      expect(dataSpy).toBeCalledWith(obj);
    });

    it('Call data layer to get unread message count for one conversation', async () => {
      const dataSpy = jest
        .spyOn(conversationData, 'getUnreadCountInConversation')
        .mockImplementationOnce(() => {
          return Promise.resolve(0);
        });
      await service.getUnreadCountInConversation(
        authenticatedUser,
        testConversationIds[0],
      );

      expect(dataSpy).toBeCalledWith(testMemberId, testConversationIds[0]);
    });
  });

  describe('Pinned Messages', () => {
    describe('pinMessage', () => {
      it('should pin a message to an existing conversation ', async () => {
        const mockConversation: ChatConversationModel = {
          id: '321b1a570ff321b1a570ff01',
          product: Product.community,
          context: [],
          memberIds: [],
          permissions: [],
          blockedMemberIds: [],
          lastMessageId: new ObjectID(),
          pinnedMessages: [new ObjectID()],
        };

        jest
          .spyOn(conversationData, 'getConversation')
          .mockImplementationOnce(() => {
            return Promise.resolve(mockConversation);
          });

        jest
          .spyOn(conversationData, 'pinMessage')
          .mockImplementationOnce(
            (conversationId: string, messageId: ObjectID) =>
              Promise.resolve({
                ...mockConversation,
                pinnedMessages: [
                  ...(mockConversation.pinnedMessages ?? []),
                  messageId,
                ],
              }),
          );

        jest.spyOn(conversationChannel, 'send');

        const newMessageId = new ObjectID();

        await service.pinMessage(
          {
            conversationId: '321b1a570ff321b1a570ff01',
            messageId: newMessageId,
          },
          { userId: new ObjectID(), accountRole: 'university' },
        );

        expect(conversationData.pinMessage).toHaveBeenCalledWith(
          '321b1a570ff321b1a570ff01',
          newMessageId,
        );
        expect(conversationChannel.send).toHaveBeenCalledTimes(1);
      });

      it('should raise an error if conversation does not exist ', async () => {
        jest
          .spyOn(conversationData, 'getConversation')
          .mockRejectedValue(new Error('error'));

        const newMessageId = new ObjectID();
        await expect(
          service.pinMessage(
            {
              conversationId: '321b1a570ff321b1a570ff01',
              messageId: newMessageId,
            },
            { userId: new ObjectID(), accountRole: 'university' },
          ),
        ).rejects.toEqual(
          new UserInputError('Cannot pin message: conversation not found'),
        );
      });

      it('should throw an error if the user is not authorised to pin to the conversation', async () => {
        jest
          .spyOn(permissionsService, 'conversationPermissions')
          .mockImplementationOnce(() => {
            return Promise.resolve(false);
          });
        await expect(
          service.pinMessage(
            {
              conversationId: '321b1a570ff321b1a570ff01',
              messageId: new ObjectID(),
            },
            { userId: new ObjectID(), accountRole: 'university' },
          ),
        ).rejects.toEqual(
          new ForbiddenError(
            'User is not authorised to pin a message to this conversation',
          ),
        );
      });
    });

    describe('unpinMessage', () => {
      it('should unpin a message from an existing conversation ', async () => {
        const messageId = new ObjectID();
        const mockConversation: ChatConversationModel = {
          id: '321b1a570ff321b1a570ff01',
          product: Product.community,
          context: [],
          memberIds: [],
          permissions: [],
          blockedMemberIds: [],
          lastMessageId: new ObjectID(),
          pinnedMessages: [messageId],
        };

        jest
          .spyOn(conversationData, 'getConversation')
          .mockImplementationOnce(() => {
            return Promise.resolve(mockConversation);
          });

        jest
          .spyOn(conversationData, 'unpinMessage')
          .mockImplementationOnce(
            (conversationId: string, messageId: ObjectID) =>
              Promise.resolve({
                ...mockConversation,
                pinnedMessages: [
                  ...(mockConversation.pinnedMessages ?? []),
                  messageId,
                ],
              }),
          );
        jest.spyOn(conversationChannel, 'send');

        await service.unpinMessage(
          { conversationId: '321b1a570ff321b1a570ff01', messageId: messageId },
          { userId: new ObjectID(), accountRole: 'university' },
        );

        expect(conversationData.unpinMessage).toHaveBeenCalledWith(
          '321b1a570ff321b1a570ff01',
          messageId,
        );
        expect(conversationChannel.send).toHaveBeenCalledTimes(1);
      });

      it('should raise an error if conversation does not exist ', async () => {
        const messageId = new ObjectID();
        jest
          .spyOn(conversationData, 'getConversation')
          .mockRejectedValue(new Error('error'));

        await expect(
          service.unpinMessage(
            {
              conversationId: '321b1a570ff321b1a570ff01',
              messageId: messageId,
            },
            { userId: new ObjectID(), accountRole: 'university' },
          ),
        ).rejects.toEqual(
          new UserInputError('Cannot unpin message: conversation not found'),
        );
      });

      it('should throw an error if the user is not authorised to unpin from the conversation', async () => {
        jest
          .spyOn(permissionsService, 'conversationPermissions')
          .mockImplementationOnce(() => {
            return Promise.resolve(false);
          });
        await expect(
          service.unpinMessage(
            {
              conversationId: '321b1a570ff321b1a570ff01',
              messageId: new ObjectID(),
            },
            { userId: new ObjectID(), accountRole: 'university' },
          ),
        ).rejects.toEqual(
          new ForbiddenError(
            'User is not authorised to unpin a message from this conversation',
          ),
        );
      });
    });
  });

  describe('Conversations for Inbox', () => {
    it('conversations returned for given contexts', async () => {
      const userId = new ObjectID('321b1a570ff321b1a570ff01');
      const authenticatedUser: IAuthenticatedUser = {
        userId,
        accountRole: 'university',
        universityId: new ObjectID('321b1a570ff321b1a570ff02'),
      };
      const context: Context = {
        id: '321b1a570ff321b1a570ff03',
        type: ContextType.university,
      };
      const testConversation: ChatConversationModel = {
        id: '321b1a570ff321b1a570ff04',
        permissions: [],
        product: Product.community,
        context: [context],
        memberIds: [userId.toHexString()],
        blockedMemberIds: [],
        lastMessageId: new ObjectID('321b1a570ff321b1a570ff05'),
      };
      jest.spyOn(conversationData, 'getConversationsForInbox').mockReturnValue(
        new Promise((resolve) => {
          resolve([testConversation]);
        }),
      );

      const result = await service.getConversationsForInbox(authenticatedUser, [
        context,
      ]);

      expect(result.length).toEqual(1);
      expect(result[0].id).toEqual('321b1a570ff321b1a570ff04');
    });
  });

  describe('Add and Remove members', () => {
    describe('addMember', () => {
      it('should call conversation socket channel and call data layer with appropriate parameters', async () => {
        const mockConversationId = 'some-conversation-id';
        const mockMemberId = 'some-user-id';

        const mockConversation: ChatConversationModel = {
          id: mockConversationId,
          product: Product.community,
          context: [],
          memberIds: [],
          permissions: [],
          blockedMemberIds: [],
          lastMessageId: new ObjectID(),
          pinnedMessages: [new ObjectID()],
        };

        jest.spyOn(conversationData, 'addMember').mockImplementationOnce(() => {
          return Promise.resolve(mockConversation);
        });

        jest.spyOn(conversationChannel, 'send');

        await service.addMember(mockConversationId, {
          userId: mockMemberId,
        });

        expect(conversationData.addMember).toHaveBeenCalledWith(
          mockConversationId,
          {
            userId: mockMemberId,
          },
        );
        expect(conversationChannel.send).toHaveBeenCalledTimes(1);
      });
    });

    describe('removeMember', () => {
      it('should call conversation socket channel and call data layer with appropriate parameters', async () => {
        const mockConversationId = 'some-conversation-id';
        const mockMemberId = 'some-user-id';

        const mockConversation: ChatConversationModel = {
          id: mockConversationId,
          product: Product.community,
          context: [],
          memberIds: [],
          permissions: [],
          blockedMemberIds: [],
          lastMessageId: new ObjectID(),
          pinnedMessages: [new ObjectID()],
        };

        jest
          .spyOn(conversationData, 'removeMember')
          .mockImplementationOnce(() => {
            return Promise.resolve(mockConversation);
          });

        jest.spyOn(conversationChannel, 'send');

        await service.removeMember(mockConversationId, mockMemberId);

        expect(conversationData.removeMember).toHaveBeenCalledWith(
          mockConversationId,
          mockMemberId,
        );
        expect(conversationChannel.send).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('should update tags for a conversation', async () => {
    const tag1 = new Tag();
    tag1.id = 'tag1';
    tag1.type = TagType.subTopic;
    const tag2 = new Tag();
    tag2.id = 'tag2';
    tag2.type = TagType.subTopic;
    const tags = [tag1, tag2];
    const mockConversation: ChatConversationModel = {
      id: '321b1a570ff321b1a570ff01',
      product: Product.community,
      context: [],
      memberIds: [],
      permissions: [],
      blockedMemberIds: [],
      lastMessageId: new ObjectID(),
      pinnedMessages: [new ObjectID()],
      tags: tags,
    };

    const spy = jest
      .spyOn(conversationData, 'updateTags')
      .mockImplementationOnce(() => {
        return Promise.resolve(mockConversation);
      });

    const updatedRecord = await service.updateTags(
      '321b1a570ff321b1a570ff01',
      tags,
    );

    expect(spy).toBeCalledWith('321b1a570ff321b1a570ff01', tags);
    expect(updatedRecord).toEqual(mockConversation);
  });

  it('should create new direct conversation', async () => {
    const mockDirectConversation: ChatConversationModel = {
      id: '321b1a570ff321b1a570ff41',
      product: Product.community,
      context: [{ id: true, type: ContextType.isDirectConversation }],
      memberIds: [],
      permissions: [],
      blockedMemberIds: [],
      lastMessageId: new ObjectID(),
      pinnedMessages: [new ObjectID()],
      tags: [],
    };

    const existenceCheckFunSpy = jest
      .spyOn(conversationData, 'getConversationByAllMemberIdsAndContext')
      .mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

    const creationFunSpy = jest
      .spyOn(conversationData, 'createChatConversation')
      .mockImplementationOnce(() => {
        return Promise.resolve(mockDirectConversation);
      });

    const res = await service.createDirectChatConversation(
      {} as DirectChatConversationDto,
    );

    expect(existenceCheckFunSpy).toHaveBeenCalled();
    expect(creationFunSpy).toHaveBeenCalled();
    expect(res).toEqual(mockDirectConversation);
  });

  it('should not create new direct conversation, throw ForbiddenError', async () => {
    jest
      .spyOn(userBlocksLogic, 'userToUserBlockingExists')
      .mockImplementationOnce(() => {
        return Promise.resolve(true);
      });

    try {
      await service.createDirectChatConversation(
        {} as DirectChatConversationDto,
      );
    } catch (error) {
      expect(error.message).toEqual(
        'User to User blocking exists, direct conversation cannot be created.',
      );
    }
  });

  it('should call message logic to messages', async () => {
    jest
      .spyOn(messageLogic, 'getMessagesByConversation')
      .mockImplementationOnce(() => {
        return Promise.resolve([]);
      });

    await service.getMessagesByConversation({} as MessagesFilterInput);
    expect(messageLogic.getMessagesByConversation).toBeCalled();
  });
});
