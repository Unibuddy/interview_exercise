import { ContextSchema } from './../conversation/models/ContextSchema.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageLogic } from './message.logic';
import { MessageData } from './message.data';
import {
  AttachmentType,
  GetMessageDto,
  GifType,
  MessageDto,
  PollDto,
} from './models/message.dto';
import {
  ConversationChannel,
  DeleteMessageEvent,
  LikeMessageEvent,
  ReactedMessageEvent,
  ResolveMessageEvent,
  SendMessageEvent,
  UnReactedMessageEvent,
  UnlikeMessageEvent,
  UnresolveMessageEvent,
} from '../conversation/conversation-channel.socket';
import { PermissionsService } from '../permissions/permissions.service';
import { ObjectID, ObjectId } from 'mongodb';
import { ForbiddenError } from 'apollo-server-errors';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { UserService } from '../user/user.service';
import { ConversationData } from '../conversation/conversation.data';
import { ChatConversationModel } from '../conversation/models/conversation.model';
import {
  Context,
  ContextType,
  Product,
} from '../conversation/models/ContextSchema.dto';
import { ChatMessageModel } from './models/message.model';
import { SafeguardingService } from '../safeguarding/safeguarding.service';
import {
  IUserBlocksLogic,
  UserBlocksLogic,
} from '../user-blocks/user-blocks.logic';
import {
  UserBlockScope,
  UserBlockDTo,
} from '../user-blocks/models/user-blocks.model';
import { PaginatedChatMessages } from './models/message.entity';
import {
  ConversationDTO,
  ConversationLogic,
} from '../conversation/conversation.logic';
import { AddMemberDTO } from '../conversation/models/AddMember.dto';
import { LastRead } from '../conversation/models/LastRead.entity';
import {
  UnreadCountInput,
  UnreadCountOutput,
} from '../conversation/models/unreadCount.dto';
import {
  LastMessageInput,
  LastMessageOutput,
} from '../conversation/models/lastMessage.dto';
import { Permission } from '../conversation/models/Permission.dto';
import { LastReadInput } from '../conversation/models/LastReadInput.dto';
import { Tag } from '../conversation/models/CreateChatConversation.dto';

const UNAUTHORISED_USER = new ObjectId('321b1a570ff321b1a570ff01');
const validUser: IAuthenticatedUser = {
  userId: new ObjectId(),
  accountRole: 'university',
  universityId: new ObjectId('abcdef123456abcdef000123'),
};

const messageId = new ObjectId('5fe0cce861c8ea54018385aa');
const replyMessageId = new ObjectId('5fe0cce861c8ea54018385ab');
const senderId = new ObjectId('5fe0cce861c8ea54018385af');
const senderIdTwo = new ObjectId('5fe0cce861c8ea54018385bc');
const conversationId = new ObjectId('5fe0cce861c8ea54018385ae');
const created = new Date('2018-05-11T17:47:40.893Z');
const USER_ID_BLOCKED = new ObjectId('abcdef123456abcdef000001');
const USER_ID_BLOCKING = new ObjectId('abcdef123456abcdef000002');
const SCOPE = 'university';
const SCOPE_ID = new ObjectId('abcdef123456abcdef000003');
const mockGiphyContent = {
  giphy: {
    type: GifType.Gif,
    id: 'YsTs5ltWtEhnq',
    height: 300,
    width: 200,
    aspectRatio: 0.667,
  },
};
const mockPollContentWithSingleOption = {
  poll: {
    question: 'What does everyone prefer for lunch?',
    options: [
      { option: 'Pizza' },
      { option: 'Pasta' },
      { option: 'Burger' },
      { option: 'Salad' },
    ],
    allowMultipleAnswers: false,
  },
};

const votes = new Set<ObjectID>();
votes.add(validUser.userId);

const mockPollContentWithOptionBurgerSelected = {
  poll: {
    question: 'What does everyone prefer for lunch?',
    options: [
      { option: 'Pizza' },
      { option: 'Pasta' },
      { option: 'Burger', votes: votes },
      { option: 'Salad' },
    ],
    allowMultipleAnswers: false,
  },
};

const replyMessageModel: ChatMessageModel = {
  id: new ObjectID(replyMessageId),
  text: 'test',
  created,
  sender: {
    id: senderId.toHexString(),
  },
  senderId,
  conversationId,
  conversation: {
    id: conversationId.toHexString(),
  },
  deleted: false,
  resolved: false,
  likes: [],
  likesCount: 0,
};

const USER_BLOCK_DTO = {
  blockedUserId: USER_ID_BLOCKED,
  blockingUserId: USER_ID_BLOCKING,
  scope: SCOPE,
  scopeId: SCOPE_ID,
};

describe('MessageLogic', () => {
  let messageLogic: MessageLogic;
  let messageData: MessageData;
  let conversationData: ConversationData;
  let conversationChannel: ConversationChannel;
  let safeguardingService: SafeguardingService;
  let permissionsService: PermissionsService;

  const mockCreatedMessage = {
    _id: messageId,
    text: 'Message 1',
    senderId,
    conversationId,
    created: new Date('2018-05-11T17:47:40.893Z'),
    sender: { id: '5fe0cce861c8ea54018385af' },
    conversation: { id: '5fe0cce861c8ea54018385ae' },
    id: messageId,
    deleted: false,
    resolved: false,
    likes: [],
    likesCount: 0,
  };

  const mockGifMessage = {
    ...mockCreatedMessage,
    richContent: mockGiphyContent,
  };

  const mockPollMessage = {
    ...mockCreatedMessage,
    richContent: mockPollContentWithSingleOption,
  };

  const mockPollMessageWithOptionSelected = {
    ...mockCreatedMessage,
    richContent: mockPollContentWithOptionBurgerSelected,
  };

  const replyMessage = {
    _id: replyMessageId,
    text: 'replying',
    senderIdTwo,
    conversationId,
    created: new Date('2018-05-11T17:47:40.893Z'),
    sender: { id: '5fe0cce861c8ea54018385bc' },
    conversation: { id: '5fe0cce861c8ea54018385ae' },
    id: replyMessageId,
    deleted: false,
    resolved: false,
    likes: [],
    likesCount: 0,
    richContent: {
      reply: {
        id: messageId,
        richContent: mockGiphyContent,
      },
    },
  };

  const mockUser = {
    id: senderId.toHexString(),
    email: 'bob@unibuddy.com',
    firstName: 'Bob',
    lastName: 'Bobbins',
    accountRole: 'university',
  };

  const mockConversation: ChatConversationModel = {
    id: mockCreatedMessage.conversationId.toHexString(),
    context: [
      {
        type: ContextType.university,
        id: validUser.universityId?.toHexString() ?? 'abcdef123456abcdef000123',
      },
    ],
    product: Product.community,
    permissions: [],
    memberIds: [],
    blockedMemberIds: [],
    lastMessageId: new ObjectId(),
  };

  class MockedChatMessageData {
    async getMessage(messageId: string): Promise<ChatMessageModel> {
      return Promise.resolve({
        ...replyMessageModel,
        id: new ObjectId(messageId),
      });
    }

    create(data: MessageDto, sender: ObjectId) {
      if (data.richContent?.reply) {
        return replyMessage;
      }

      if (data.richContent?.giphy) {
        return mockGifMessage;
      }
      return mockCreatedMessage;
    }

    delete(messageId: ObjectId, sender: ObjectId) {
      return {
        _id: messageId,
        text: 'Message 1',
        senderId,
        conversationId,
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: { id: '5fe0cce861c8ea54018385af' },
        conversation: { id: '5fe0cce861c8ea54018385ae' },
        id: messageId,
        deleted: true,
        resolved: false,
      };
    }

    resolve(messageId: ObjectId) {
      return {
        _id: messageId,
        text: 'Message 1',
        senderId,
        conversationId,
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: { id: '5fe0cce861c8ea54018385af' },
        conversation: { id: '5fe0cce861c8ea54018385ae' },
        id: messageId,
        deleted: false,
        resolved: true,
      };
    }

    unresolve(messageId: ObjectId) {
      return {
        _id: messageId,
        text: 'Message 1',
        senderId,
        conversationId,
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: { id: '5fe0cce861c8ea54018385af' },
        conversation: { id: '5fe0cce861c8ea54018385ae' },
        id: messageId,
        deleted: false,
        resolved: false,
      };
    }

    like(userId: ObjectId, messageId: ObjectId) {
      return {
        _id: messageId,
        text: 'Message 1',
        senderId: userId,
        conversationId,
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: { id: '5fe0cce861c8ea54018385af' },
        conversation: { id: '5fe0cce861c8ea54018385ae' },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
      };
    }

    unlike(userId: ObjectId, messageId: ObjectId) {
      return {
        _id: messageId,
        text: 'Message 1',
        senderId: userId,
        conversationId,
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: { id: '5fe0cce861c8ea54018385af' },
        conversation: { id: '5fe0cce861c8ea54018385ae' },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
      };
    }

    getChatConversationMessages(
      data: GetMessageDto,
    ): Promise<PaginatedChatMessages> {
      const allMessages = [
        {
          id: messageId,
          text: 'message',
          created: new Date('2018-05-11T17:47:40.893Z'),
          sender: {
            id: validUser.userId.toHexString(),
            firstName: 'Bob',
            accountRole: validUser.accountRole,
          },

          deleted: false,
          resolved: false,
          likes: [],
          likesCount: 0,
          isSenderBlocked: false,
        },

        {
          id: messageId,
          text: 'message by blocked user',
          created: new Date('2018-05-11T17:47:40.893Z'),
          sender: {
            id: USER_ID_BLOCKED.toHexString(),
            firstName: 'Bob',
            accountRole: validUser.accountRole,
          },
          deleted: false,
          resolved: false,
          likes: [],
          likesCount: 0,
          isSenderBlocked: false,
        },
      ];

      //limitted data based on given limit in pagination
      const messages = allMessages.slice(
        0,
        Math.min(data.limit, allMessages.length),
      );

      return Promise.resolve({
        messages,
        hasMore: false,
      });
    }

    private getMockMessage(messageId: string, userId: string) {
      return {
        _id: messageId,
        text: 'Message 1',
        senderId: userId,
        conversationId,
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: { id: '5fe0cce861c8ea54018385af' },
        conversation: { id: '5fe0cce861c8ea54018385ae' },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
      };
    }

    addReaction(
      reaction: string,
      userId: ObjectID,
      reactionUnicode: string,
      messageId: ObjectID,
    ) {
      return Promise.resolve(
        this.getMockMessage(messageId.toHexString(), userId.toHexString()),
      );
    }

    removeReaction(reaction: string, userId: ObjectID, messageId: ObjectID) {
      return Promise.resolve(
        this.getMockMessage(messageId.toHexString(), userId.toHexString()),
      );
    }

    addVote(messageId: ObjectID, userId: ObjectID, option: string) {
      return Promise.resolve(
        this.getMockMessage(messageId.toHexString(), userId.toHexString()),
      );
    }

    removeVote(messageId: ObjectID, userId: ObjectID, option: string) {
      return Promise.resolve(
        this.getMockMessage(messageId.toHexString(), userId.toHexString()),
      );
    }
  }

  class MockPermissionsService {
    conversationPermissions() {
      return true;
    }
    messagePermissions({ user }: { user: IAuthenticatedUser }) {
      if (user.userId === UNAUTHORISED_USER) return false;
      return true;
    }
  }
  class MockUserService {
    getUser(id: string) {
      return { ...mockUser, id };
    }
  }

  class MockedSafeguardingService {
    clean = jest.fn().mockReturnValue('clean message');
  }

  class MockedConversationData {
    getConversation() {
      return mockConversation;
    }
    updateConversationWithLastMessage() {
      return mockConversation;
    }
    recordLastMessageReadByUser() {
      return {
        userId: validUser.userId.toHexString(),
        conversationId,
        messageId,
      };
    }
  }

  class MockPinMessageDTO {
    messageId: ObjectID;
    conversationId: string;
  }
  class MockUnpinMessageDTO {
    messageId: ObjectID;
    conversationId: string;
  }
  class MockCreateChatConversationDto {
    product: Product;
    context: Context[];
    permissions?: Permission[];
    tags?: Tag[];
  }

  class MockedConversationLogic {
    getConversation(
      id: string,
      authenticatedUser: IAuthenticatedUser,
    ): Promise<ChatConversationModel> {
      return Promise.resolve(mockConversation);
    }
    removeMember(
      conversationId: string,
      memberId: string,
    ): Promise<ChatConversationModel> {
      throw new Error('Method not implemented.');
    }
    addMember(
      conversationId: string,
      addMember: AddMemberDTO,
    ): Promise<ChatConversationModel> {
      throw new Error('Method not implemented.');
    }
    pinMessage(
      pinMessageDTO: MockPinMessageDTO,
      authenticatedUser: IAuthenticatedUser,
    ): Promise<ChatConversationModel> {
      throw new Error('Method not implemented.');
    }
    unpinMessage(
      unpinMessageDTO: MockUnpinMessageDTO,
      authenticatedUser: IAuthenticatedUser,
    ): Promise<ChatConversationModel> {
      throw new Error('Method not implemented.');
    }
    blockMember(conversationIds: string[], memberId: string): Promise<void> {
      throw new Error('Method not implemented.');
    }

    unblockMember(conversationIds: string[], memberId: string): Promise<void> {
      throw new Error('Method not implemented.');
    }
    create(
      createChatConversationDto: MockCreateChatConversationDto,
    ): Promise<ConversationDTO> {
      throw new Error('Method not implemented.');
    }
    migratePermissions(
      chatPermissionsDto: Permission[],
      product: Product,
    ): Promise<boolean> {
      throw new Error('Method not implemented.');
    }
    recordLastMessageReadByUser({
      conversationId,
      messageId,
      authenticatedUser,
    }: LastReadInput): Promise<LastRead> {
      throw new Error('Method not implemented.');
    }
    getUnreadMessageCounts(
      unreadCountInput: UnreadCountInput,
    ): Promise<UnreadCountOutput[]> {
      throw new Error('Method not implemented.');
    }
    getUnreadCountInConversation(
      authenticatedUser: IAuthenticatedUser,
      conversationId: string,
    ): Promise<number> {
      throw new Error('Method not implemented.');
    }
    getLastMessages(
      lastMessageInput: LastMessageInput,
    ): Promise<LastMessageOutput[]> {
      throw new Error('Method not implemented.');
    }
    updateTags(conversationId: string, tags: Tag[]): Promise<ConversationDTO> {
      throw new Error('Method not implemented.');
    }

    isDirectConversation(contexts: ContextSchema[]): boolean {
      return false;
    }
  }

  class MockConversationChannel {
    send = jest.fn();
  }


  class MockUserBlocksLogic implements IUserBlocksLogic {
    getBlockedUsers(
      userIds: ObjectID[],
      scope: UserBlockScope,
    ): Promise<UserBlockDTo[]> {
      return Promise.resolve([
        {
          blockedUserId: USER_ID_BLOCKED,
          blockingUserId: USER_ID_BLOCKING,
          scope: scope.scope,
          scopeId: scope.scopeId,
        },
      ]);
    }

    isUserBlocked(
      userId: ObjectID,
      scopes: UserBlockScope[],
    ): Promise<boolean> {
      return Promise.resolve(true);
    }
    blockUser(userBlock: UserBlockDTo): Promise<UserBlockDTo> {
      return Promise.resolve(USER_BLOCK_DTO);
    }
    unblockUser(userId: ObjectID, scope: UserBlockScope): Promise<boolean> {
      return Promise.resolve(true);
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageLogic,
        { provide: ConversationLogic, useClass: MockedConversationLogic },
        { provide: MessageData, useClass: MockedChatMessageData },
        { provide: ConversationData, useClass: MockedConversationData },
        { provide: ConversationChannel, useClass: MockConversationChannel },
        { provide: PermissionsService, useClass: MockPermissionsService },
        { provide: UserService, useClass: MockUserService },
        { provide: SafeguardingService, useClass: MockedSafeguardingService },
        { provide: UserBlocksLogic, useClass: MockUserBlocksLogic },
      ],
    }).compile();

    messageLogic = module.get<MessageLogic>(MessageLogic);
    messageData = module.get<MessageData>(MessageData);
    conversationData = module.get<ConversationData>(ConversationData);
    conversationChannel = module.get<ConversationChannel>(ConversationChannel);
    permissionsService = module.get<PermissionsService>(PermissionsService);
    safeguardingService = module.get<SafeguardingService>(SafeguardingService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(messageLogic).toBeDefined();
  });

  describe('create', () => {
    it('can create a new message with pusher implementation', async () => {
      jest.spyOn(messageData, 'create');
      await messageLogic.create(
        { text: 'This is my message text', conversationId },
        { ...validUser, userId: senderId },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: '5fe0cce861c8ea54018385af',
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        isSenderBlocked: false,
      });

      expect(safeguardingService.clean).toHaveBeenCalledTimes(1);
      expect(safeguardingService.clean).toBeCalledWith('Message 1');

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });

    it('can create a new reply message with pusher implementation', async () => {
      jest.spyOn(messageData, 'create');
      await messageLogic.create(
        {
          text: 'replying',
          conversationId,
          richContent: { reply: { id: messageId } },
        },
        { ...validUser, userId: senderIdTwo },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: senderIdTwo.toHexString(),
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: replyMessageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        richContent: {
          reply: {
            created,
            deleted: false,
            id: messageId,
            sender: {
              id: senderId.toHexString(),
              accountRole: 'university',
              firstName: 'Bob',
            },
            text: 'clean message',
          },
        },
        isSenderBlocked: false,
      });

      expect(safeguardingService.clean).toBeCalledTimes(2);
      expect(safeguardingService.clean).toBeCalledWith('replying');
      expect(safeguardingService.clean).toBeCalledWith('test');

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });

    it('can create a new gif message with pusher implementation', async () => {
      const giphyId = 'YsTs5ltWtEhnq';
      const height = 300;
      const width = 200;
      const aspectRatio = width / height;

      jest.spyOn(messageData, 'create');
      await messageLogic.create(
        {
          text: 'gif',
          conversationId,
          richContent: mockGiphyContent,
        },
        { ...validUser, userId: senderIdTwo },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: senderIdTwo.toHexString(),
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        richContent: {
          giphy: {
            type: GifType.Gif,
            id: giphyId,
            height,
            width,
            aspectRatio: Number(aspectRatio.toPrecision(3)),
          },
        },
        isSenderBlocked: false,
      });

      expect(safeguardingService.clean).toBeCalledTimes(1);
      expect(safeguardingService.clean).toBeCalledWith('Message 1');

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });

    it('can create a new message having images richContent with pusher implementation', async () => {
      const mockImages = [
        {
          url: 'someurl.com/image.png',
        },
      ];

      jest.spyOn(messageData, 'create');
      await messageLogic.create(
        {
          text: 'an image',
          conversationId,
          richContent: {
            images: mockImages,
          },
        },
        { ...validUser, userId: senderIdTwo },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: senderIdTwo.toHexString(),
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        richContent: {
          images: mockImages,
        },
        isSenderBlocked: false,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });

    it('can create a new message having attachments richContent with pusher implementation', async () => {
      const mockAttachments = [
        {
          link: 'someurl.com/image.pdf',
          type: AttachmentType.PDF,
          size: '200kb',
          fileName: 'name here',
        },
      ];

      jest.spyOn(messageData, 'create');
      await messageLogic.create(
        {
          text: 'mockAttachments',
          conversationId,
          richContent: {
            attachments: mockAttachments,
          },
        },
        { ...validUser, userId: senderIdTwo },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: senderIdTwo.toHexString(),
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        richContent: {
          attachments: mockAttachments,
        },
        isSenderBlocked: false,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });

    it('can create a new message having poll richContent with pusher implementation', async () => {
      const mockPoll: PollDto = {
        question: 'Which sports do you like the most',
        options: [
          { option: 'Swimming', votes: new Set() },
          { option: 'Snooker', votes: new Set() },
        ],
        allowMultipleAnswers: false,
      };

      jest.spyOn(messageData, 'create');
      await messageLogic.create(
        {
          text: 'mockPoll',
          conversationId,
          richContent: {
            poll: mockPoll,
          },
        },
        { ...validUser, userId: senderIdTwo },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: senderIdTwo.toHexString(),
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: messageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        richContent: {
          poll: mockPoll,
        },
        isSenderBlocked: false,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });

    it('can not create a poll with invalid user', async () => {
      jest
        .spyOn(permissionsService, 'conversationPermissions')
        .mockImplementationOnce(() => {
          return Promise.resolve(true);
        })
        .mockImplementationOnce(() => {
          return Promise.resolve(false);
        });

      const mockPoll: PollDto = {
        question: 'Which sports do you like the most',
        options: [
          { option: 'Swimming', votes: new Set() },
          { option: 'Snooker', votes: new Set() },
        ],
        allowMultipleAnswers: false,
      };

      const invalidUser: IAuthenticatedUser = {
        userId: new ObjectID('321b1a570ff321b1a570ff01'),
        accountRole: 'applicant',
        universityId: new ObjectId('abcdef123456abcdef000123'),
      };

      const expectedError = new Error(
        `User is not authorised to create a poll`,
      );
      await expect(
        messageLogic.create(
          {
            text: 'mockPoll',
            conversationId,
            richContent: {
              poll: mockPoll,
            },
          },
          { ...invalidUser, userId: senderIdTwo },
        ),
      ).rejects.toEqual(expectedError);

      expect(conversationChannel.send).toHaveBeenCalledTimes(0);
    });

    it('can create a new reply message for richContent message with pusher implementation', async () => {
      jest.spyOn(messageData, 'create');
      jest
        .spyOn(messageData, 'getMessage')
        .mockImplementationOnce((messageId) => {
          return Promise.resolve({
            ...replyMessageModel,
            id: new ObjectId(messageId),
            richContent: mockGiphyContent,
          });
        });

      const giphyMessage = await messageLogic.create(
        {
          text: 'gif',
          conversationId,
          richContent: mockGiphyContent,
        },
        { ...validUser, userId: senderIdTwo },
      );

      await messageLogic.create(
        {
          text: 'replying',
          conversationId,
          richContent: { reply: { id: giphyMessage.id } },
        },
        { ...validUser, userId: senderIdTwo },
      );

      const sendMessageEvent = new SendMessageEvent({
        text: 'clean message',
        created: new Date('2018-05-11T17:47:40.893Z'),
        sender: {
          id: senderIdTwo.toHexString(),
          firstName: 'Bob',
          accountRole: validUser.accountRole,
        },
        id: replyMessageId,
        deleted: false,
        resolved: false,
        likes: [],
        likesCount: 0,
        richContent: {
          reply: {
            created,
            deleted: false,
            id: messageId,
            sender: {
              id: senderId.toHexString(),
              accountRole: 'university',
              firstName: 'Bob',
            },
            text: 'clean message',
            richContent: mockGiphyContent,
          },
        },
        isSenderBlocked: false,
      });

      expect(safeguardingService.clean).toBeCalledTimes(3);

      // for giphy message
      expect(safeguardingService.clean).toBeCalledWith('Message 1');

      // for reply message
      expect(safeguardingService.clean).toBeCalledWith('replying');
      expect(safeguardingService.clean).toBeCalledWith('test');

      expect(conversationChannel.send).toHaveBeenCalledWith(
        sendMessageEvent,
        conversationId.toHexString(),
      );

      // once for giphy message, once for reply to the giphy
      expect(conversationChannel.send).toHaveBeenCalledTimes(2);
    });

    it('can create a new message with kafka implementation', async () => {
      await messageLogic.create(
        { text: 'This is my message text', conversationId },
        {
          ...validUser,
          userId: senderId,
        },
      );
    });

    it('updates conversation with last messageId while creating a message', async () => {
      jest.spyOn(conversationData, 'updateConversationWithLastMessage');
      const createdMessage = await messageLogic.create(
        { text: 'This is my message text', conversationId },
        validUser,
      );
      expect(
        conversationData.updateConversationWithLastMessage,
      ).toHaveBeenCalledWith(conversationId.toHexString(), createdMessage.id);
    });

    it('registers last read for current user while creating the message', async () => {
      jest.spyOn(conversationData, 'recordLastMessageReadByUser');
      const createdMessage = await messageLogic.create(
        { text: 'This is another message', conversationId },
        validUser,
      );
      expect(conversationData.recordLastMessageReadByUser).toHaveBeenCalledWith(
        {
          conversationId: conversationId.toHexString(),
          messageId: createdMessage.id,
          authenticatedUser: validUser,
        },
      );
    });
  });

  describe('getMessage', () => {
    it('should be able to get a message', async () => {
      const result = await messageLogic.getMessage(replyMessageId, validUser);

      expect(result).toEqual(replyMessageModel);
    });

    it('should throw a forbidden error when getting a message for an unauthorised user', async () => {
      const result = messageLogic.getMessage(replyMessageId, {
        ...validUser,
        userId: UNAUTHORISED_USER,
      });

      await expect(result).rejects.toThrow(
        'User is not authorised to read this message',
      );
    });
  });

  describe('delete', () => {
    it('can delete a message with pusher implementation', async () => {
      jest.spyOn(messageData, 'delete');
      await messageLogic.delete({ messageId, conversationId }, validUser);

      const deleteMessageEvent = new DeleteMessageEvent({ id: messageId });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        deleteMessageEvent,
        conversationId.toHexString(),
      );

      expect(conversationChannel.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('like', () => {
    it('can like a message with sockets', async () => {
      jest.spyOn(messageData, 'like');
      await messageLogic.like(
        { userId: senderId, messageId, conversationId },
        validUser,
      );

      const likeMessageEvent = new LikeMessageEvent({
        userId: senderId,
        messageId,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        likeMessageEvent,
        conversationId.toHexString(),
      );
      expect(messageData.like).toHaveBeenCalledTimes(1);
    });

    it('can unlike a message with sockets', async () => {
      jest.spyOn(messageData, 'unlike');
      await messageLogic.unlike(
        { userId: senderId, messageId, conversationId },
        validUser,
      );

      const unlikeMessageEvent = new UnlikeMessageEvent({
        userId: senderId,
        messageId,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        unlikeMessageEvent,
        conversationId.toHexString(),
      );

      expect(messageData.unlike).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolve', () => {
    it('should emit a resolve message event', async () => {
      jest.spyOn(messageData, 'resolve');
      await messageLogic.resolve({ messageId, conversationId }, validUser);

      const resolveMessageEvent = new ResolveMessageEvent({
        id: messageId,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        resolveMessageEvent,
        conversationId.toHexString(),
      );
    });

    it('should call resolve in the data layer', async () => {
      jest.spyOn(messageData, 'resolve');
      await messageLogic.resolve({ messageId, conversationId }, validUser);

      expect(messageData.resolve).toHaveBeenCalledTimes(1);
    });

    it('should emit an unresolve event', async () => {
      jest.spyOn(messageData, 'unresolve');
      await messageLogic.unresolve({ messageId, conversationId }, validUser);

      const unresolveMessageEvent = new UnresolveMessageEvent({
        id: messageId,
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        unresolveMessageEvent,
        conversationId.toHexString(),
      );
    });

    it('should call unresolve in the data layer', async () => {
      jest.spyOn(messageData, 'unresolve');
      await messageLogic.unresolve({ messageId, conversationId }, validUser);

      expect(messageData.unresolve).toHaveBeenCalledTimes(1);
    });

    it('throws an error if the user is not authenticated', async () => {
      await expect(() =>
        messageLogic.resolve({ messageId, conversationId }),
      ).rejects.toThrow(new ForbiddenError('User is not authenticated'));

      //TODO
      // await expect(() =>
      //   messageLogic.unresolve({ userId: senderId, messageId, conversationId }),
      // ).rejects.toThrow(new ForbiddenError('User is not authenticated'));
    });
  });

  describe('getChatConversationMessages', () => {
    it('should throw if user is not authenticated', async () => {
      jest
        .spyOn(permissionsService, 'conversationPermissions')
        .mockImplementationOnce(() => {
          return Promise.resolve(false);
        });
      const getMessageDto: GetMessageDto = { conversationId, limit: 2 };
      const unauthorisedUser: IAuthenticatedUser = {
        ...validUser,
        userId: UNAUTHORISED_USER,
      };

      await expect(
        messageLogic.getChatConversationMessages(
          getMessageDto,
          unauthorisedUser,
        ),
      ).rejects.toThrow('User is not authorised to read this conversation');
    });

    it('should return chat conversation messages', async () => {
      const getMessageDto: GetMessageDto = { conversationId, limit: 2 };

      const result = await messageLogic.getChatConversationMessages(
        getMessageDto,
        validUser,
      );

      expect(result.messages).toHaveLength(2);
    });

    it('should return all chat conversation messages and set the isSenderBlock field to true for blocked users', async () => {
      const getMessageDto: GetMessageDto = { conversationId, limit: 2 };

      const messages = await messageLogic.getChatConversationMessages(
        getMessageDto,
        validUser,
      );

      expect(messages.messages[0].sender.id).not.toEqual(
        USER_ID_BLOCKED.toHexString(),
      );
      expect(messages.messages[0].isSenderBlocked).toEqual(false);

      expect(messages.messages[1].sender.id).toEqual(
        USER_ID_BLOCKED.toHexString(),
      );
      expect(messages.messages[1].isSenderBlocked).toEqual(true);
    });
  });

  describe('react / un-react', () => {
    it('can react to a message and data/ send event called', async () => {
      jest.spyOn(messageData, 'addReaction');
      await messageLogic.addReactionToMessage(
        {
          messageId,
          conversationId,
          reaction: ':like',
          reactionUnicode: ':likecode',
        },
        validUser,
      );

      const event = new ReactedMessageEvent({
        userId: validUser.userId,
        messageId,
        reaction: ':like',
        reactionUnicode: ':likecode',
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        event,
        conversationId.toHexString(),
      );
      expect(messageData.addReaction).toHaveBeenCalledTimes(1);
    });

    it('can un-react to a message  and data/ send event called', async () => {
      jest.spyOn(messageData, 'removeReaction');
      await messageLogic.removeReactionFromMessage(
        {
          messageId,
          conversationId,
          reaction: ':like',
          reactionUnicode: ':likecode',
        },
        validUser,
      );

      const event = new UnReactedMessageEvent({
        userId: validUser.userId,
        messageId,
        reaction: ':like',
        reactionUnicode: ':likecode',
      });

      expect(conversationChannel.send).toHaveBeenCalledWith(
        event,
        conversationId.toHexString(),
      );

      expect(messageData.removeReaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('addVote', () => {
    it('should be defined', () => {
      expect(messageLogic.addVote).toBeDefined();
    });

    it('should be able to add a vote', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessage));
      jest.spyOn(messageData, 'addVote');

      const option = 'Burger';
      await messageLogic.addVote(messageId, option, validUser);

      expect(messageData.addVote).toHaveBeenCalledWith(
        messageId,
        validUser.userId,
        option,
      );
    });

    it('should throw an error when wrong option is sent', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessage));
      jest.spyOn(messageData, 'addVote');

      const option = 'Croissant';
      const expectedError = new Error(
        `Option "${option}" not found in the poll`,
      );

      await expect(
        messageLogic.addVote(messageId, option, validUser),
      ).rejects.toEqual(expectedError);
    });

    it('should throw an error when voting for the same option', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessageWithOptionSelected));
      jest.spyOn(messageData, 'addVote');

      const option = 'Burger';
      const expectedError = new Error(
        `You have already voted for option: ${option}`,
      );

      await expect(
        messageLogic.addVote(messageId, option, validUser),
      ).rejects.toEqual(expectedError);
    });

    it('should throw an error when voting for the different option when allowMultipleAnswers is false', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessageWithOptionSelected));
      jest.spyOn(messageData, 'addVote');

      const option = 'Salad';
      const expectedError = new Error(
        `You can not vote for multiple options with allowMultipleAnswers: false`,
      );

      await expect(
        messageLogic.addVote(messageId, option, validUser),
      ).rejects.toEqual(expectedError);
    });

    it('should be able to add a vote when allowMultipleAnswers is true', async () => {
      const votes = new Set<ObjectID>();
      votes.add(validUser.userId);
      const mockPollMessageWithMultipleOption = {
        ...mockCreatedMessage,
        richContent: {
          poll: {
            question: 'What does everyone prefer for lunch?',
            options: [
              { option: 'Pizza', votes: votes },
              { option: 'Pasta' },
              { option: 'Burger' },
              { option: 'Salad' },
            ],
            allowMultipleAnswers: true,
          },
        },
      };
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessageWithMultipleOption));
      jest.spyOn(messageData, 'addVote');

      const option = 'Salad';
      await messageLogic.addVote(messageId, option, validUser);
      expect(messageData.addVote).toHaveBeenCalledWith(
        messageId,
        validUser.userId,
        option,
      );
    });
  });

  describe('removeVote', () => {
    it('should be defined', () => {
      expect(messageLogic.removeVote).toBeDefined();
    });

    it('should be able to remove a vote', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessageWithOptionSelected));
      jest.spyOn(messageData, 'removeVote');

      const option = 'Burger';
      await messageLogic.removeVote(messageId, option, validUser);

      expect(messageData.removeVote).toHaveBeenCalledWith(
        messageId,
        validUser.userId,
        option,
      );
    });

    it('should throw an error when wrong option is sent', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessage));
      jest.spyOn(messageData, 'removeVote');

      const option = 'Croissant';
      const expectedError = new Error(
        `Option "${option}" not found in the poll`,
      );

      await expect(
        messageLogic.removeVote(messageId, option, validUser),
      ).rejects.toEqual(expectedError);
    });

    it('should raise an error if attempting to remove a vote that was never cast initially', async () => {
      jest
        .spyOn(messageData, 'getMessage')
        .mockReturnValue(Promise.resolve(mockPollMessage));
      jest.spyOn(messageData, 'removeVote');

      const option = 'Pizza';
      const expectedError = new Error(
        `Unable to remove your vote from an option you haven't voted for`,
      );

      await expect(
        messageLogic.removeVote(messageId, option, validUser),
      ).rejects.toEqual(expectedError);
    });
  });
});
