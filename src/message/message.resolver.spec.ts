import { Test, TestingModule } from '@nestjs/testing';
import {
  MessageResolver,
  RichMessageContentResolver,
} from './message.resolver';
import { MessageLogic, IMessageLogic } from './message.logic';
import {
  GetMessageDto,
  MessageDto,
  DeleteMessageDto,
  ResolveMessageDto,
  LikeMessageDto,
  ReactionDto,
  PollDto,
} from './models/message.dto';
import { ObjectID } from 'mongodb';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { ChatMessage, PaginatedChatMessages } from './models/message.entity';
import { SafeguardingService } from '../safeguarding/safeguarding.service';
import {
  ChatMessageDataLoader,
  IChatMessageDataLoader,
} from './message.dataloader';
import {
  MessagesFilterInput,
  MessageGroupedByConversationOutput,
} from '../conversation/models/messagesFilterInput';

const conversationId = new ObjectID('5fe0cce861c8ea54018385af');
const messageId = new ObjectID('5fe0cce861c8ea54018386ab');
const emptyRichContentConversationId = new ObjectID('5fe0cce861c8ea54018385ab');
const replyRichContentConversationId = new ObjectID('7fe0cce861c8ea54018385af');
const userId = new ObjectID('5fe0cce861c8ea54018385ab');
const replyMessageId = new ObjectID('5fe0cce861c8ea54018385ac');
const senderId = new ObjectID('5fe0cce861c8ea54018385ad');
const id = new ObjectID('7fe0cce861c8ea54018385af');
const authenticatedUser: IAuthenticatedUser = {
  userId,
  accountRole: 'admin',
};

const chatMessage: ChatMessage = {
  id: messageId,
  text: 'hey',
  created: new Date('2020-12-31'),
  sender: { id: senderId.toHexString() },
  deleted: false,
  resolved: false,
  likes: [],
  likesCount: 0,
};

describe('MessageResolver', () => {
  let resolver: MessageResolver;
  let messageLogic: MockedChatMessageLogic;

  class MockedSafeguardingService {
    clean(message: string) {
      return message;
    }
  }

  class MockedChatMessageDataLoader implements IChatMessageDataLoader {
    load() {
      return Promise.resolve(chatMessage);
    }

    loadMany() {
      return Promise.resolve([chatMessage]);
    }
  }

  class MockedChatMessageLogic implements IMessageLogic {
    resolve(
      resolveMessageDto: ResolveMessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    unresolve(
      unresolveMessageDto: ResolveMessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    like(
      likeMessageDto: LikeMessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    unlike(
      unlikeMessageDto: LikeMessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    create(
      messageDto: MessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve({
        ...chatMessage,
        text: messageDto.text,
      });
    }

    delete(
      messageDto: DeleteMessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    getChatConversationMessages(
      getMessageDto: GetMessageDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<PaginatedChatMessages> {
      let chatMessage: ChatMessage[] = [];
      if (getMessageDto.conversationId === conversationId) {
        chatMessage = [
          {
            deleted: false,
            resolved: false,
            likes: [],
            likesCount: 0,
            created: new Date('2020-12-31'),
            id,
            text: 'a chat message',
            sender: { id: senderId.toHexString() },
          },
        ];
      }
      if (getMessageDto.conversationId === emptyRichContentConversationId) {
        chatMessage = [
          {
            deleted: false,
            resolved: false,
            likes: [],
            likesCount: 0,
            created: new Date('2020-12-31'),
            id,
            text: 'a chat message',
            sender: { id: senderId.toHexString() },
            richContent: {},
          },
        ];
      }
      if (getMessageDto.conversationId === replyRichContentConversationId) {
        chatMessage = [
          {
            deleted: false,
            resolved: false,
            likes: [],
            likesCount: 0,
            created: new Date('2020-12-31'),
            id,
            text: 'a reply message',
            sender: { id: senderId.toHexString() },
            richContent: {
              reply: {
                id: replyMessageId,
              },
            },
          },
        ];
      }

      return Promise.resolve({
        messages: chatMessage,
        hasMore: false,
      });
    }

    addReactionToMessage(
      reactionDto: ReactionDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    removeReactionFromMessage(
      reactionDto: ReactionDto,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    getMessagesByConversation(
      messagesFilterInput: MessagesFilterInput,
    ): Promise<MessageGroupedByConversationOutput[]> {
      return Promise.resolve([]);
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageResolver,
        { provide: MessageLogic, useClass: MockedChatMessageLogic },
        { provide: SafeguardingService, useClass: MockedSafeguardingService },
        {
          provide: ChatMessageDataLoader,
          useClass: MockedChatMessageDataLoader,
        },
      ],
    }).compile();

    resolver = module.get<MessageResolver>(MessageResolver);
    messageLogic = module.get<MessageLogic>(MessageLogic);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('sendConversationMessage', () => {
    it('should send a message with no richContent', () => {
      jest.spyOn(messageLogic, 'create');
      const message: MessageDto = {
        text: 'test',
        conversationId,
      };

      resolver.sendConversationMessage(message, authenticatedUser);
      expect(messageLogic.create).toBeCalledWith(
        { conversationId, text: 'test' },
        { accountRole: 'admin', userId },
      );
    });

    it('should send a message with richContent but no reply', () => {
      jest.spyOn(messageLogic, 'create');
      const message: MessageDto = {
        text: 'test',
        conversationId,
        richContent: {},
      };

      resolver.sendConversationMessage(message, authenticatedUser);
      expect(messageLogic.create).toBeCalledWith(
        { conversationId, richContent: {}, text: 'test' },
        { accountRole: 'admin', userId },
      );
    });

    it('should send a message with richContent with reply populated', () => {
      jest.spyOn(messageLogic, 'create');
      const message: MessageDto = {
        text: 'test',
        conversationId,
        richContent: {
          reply: {
            id: replyMessageId,
          },
        },
      };

      resolver.sendConversationMessage(message, authenticatedUser);
      expect(messageLogic.create).toBeCalledWith(
        {
          conversationId,
          richContent: {
            reply: {
              id: replyMessageId,
            },
          },
          text: 'test',
        },
        { accountRole: 'admin', userId },
      );
    });
  });

  describe('getMessagesForChatConversation', () => {
    it('should getMessages with no richContent', async () => {
      jest.spyOn(messageLogic, 'getChatConversationMessages');

      const getMessageDto: GetMessageDto = {
        conversationId,
        limit: 0,
      };

      const result = await resolver.getMessagesForChatConversation(
        getMessageDto,
        authenticatedUser,
      );
      expect(messageLogic.getChatConversationMessages).toBeCalledWith(
        { conversationId, limit: 0 },
        { accountRole: 'admin', userId },
      );
      expect(result).toEqual([
        {
          created: new Date('2020-12-31'),
          deleted: false,
          resolved: false,
          id,
          likes: [],
          likesCount: 0,
          sender: { id: senderId.toHexString() },
          text: 'a chat message',
        },
      ]);
    });

    it('should get messages with empty richContent', async () => {
      jest.spyOn(messageLogic, 'getChatConversationMessages');

      const getMessageDto: GetMessageDto = {
        conversationId: emptyRichContentConversationId,
        limit: 0,
      };

      const result = await resolver.getMessagesForChatConversation(
        getMessageDto,
        authenticatedUser,
      );
      expect(messageLogic.getChatConversationMessages).toBeCalledWith(
        { conversationId: emptyRichContentConversationId, limit: 0 },
        { accountRole: 'admin', userId },
      );
      expect(result).toEqual([
        {
          created: new Date('2020-12-31'),
          deleted: false,
          resolved: false,
          id,
          likes: [],
          likesCount: 0,
          richContent: {},
          sender: { id: senderId.toHexString() },
          text: 'a chat message',
        },
      ]);
    });

    it('should get messages with richContent with reply populated', async () => {
      jest.spyOn(messageLogic, 'getChatConversationMessages');

      const getMessageDto: GetMessageDto = {
        conversationId: replyRichContentConversationId,
        limit: 0,
      };

      const result = await resolver.getMessagesForChatConversation(
        getMessageDto,
        authenticatedUser,
      );
      expect(messageLogic.getChatConversationMessages).toBeCalledWith(
        { conversationId: replyRichContentConversationId, limit: 0 },
        { accountRole: 'admin', userId },
      );
      expect(result).toEqual([
        {
          created: new Date('2020-12-31'),
          deleted: false,
          resolved: false,
          id,
          likes: [],
          likesCount: 0,
          richContent: {
            reply: {
              id: replyMessageId,
            },
          },
          sender: { id: senderId.toHexString() },
          text: 'a reply message',
        },
      ]);
    });
  });

  describe('resolve message', () => {
    it('should resolve a message', () => {
      jest.spyOn(messageLogic, 'resolve');

      const message: ResolveMessageDto = {
        messageId,
        conversationId,
      };

      resolver.resolveConversationMessage(message, authenticatedUser);
      expect(messageLogic.resolve).toBeCalledWith(
        {
          conversationId,
          messageId,
        },
        { accountRole: 'admin', userId },
      );
    });
  });

  describe('unresolve message', () => {
    it('should unresolve a message', () => {
      jest.spyOn(messageLogic, 'unresolve');

      const message: ResolveMessageDto = {
        messageId,
        conversationId,
      };

      resolver.unresolveConversationMessage(message, authenticatedUser);
      expect(messageLogic.unresolve).toBeCalledWith(
        {
          conversationId,
          messageId,
        },
        { accountRole: 'admin', userId },
      );
    });
  });

  describe('like message', () => {
    it('should increment likes of a message', () => {
      jest.spyOn(messageLogic, 'like');

      const message: LikeMessageDto = {
        messageId,
        conversationId,
        userId,
      };

      resolver.likeConversationMessage(message, authenticatedUser);
      expect(messageLogic.like).toBeCalledWith(
        {
          conversationId,
          messageId,
          userId,
        },
        { accountRole: 'admin', userId },
      );
    });
  });

  describe('unlike message', () => {
    it('should decrement likes of a message', () => {
      jest.spyOn(messageLogic, 'unlike');

      const message: LikeMessageDto = {
        messageId,
        conversationId,
        userId,
      };

      resolver.unlikeConversationMessage(message, authenticatedUser);
      expect(messageLogic.unlike).toBeCalledWith(
        {
          conversationId,
          messageId,
          userId,
        },
        { accountRole: 'admin', userId },
      );
    });
  });

  describe('Delete message', () => {
    it('should increment Delete of a message', () => {
      jest.spyOn(messageLogic, 'delete');

      const message: DeleteMessageDto = {
        messageId,
        conversationId,
      };

      resolver.deleteConversationMessage(message, authenticatedUser);
      expect(messageLogic.delete).toBeCalledWith(
        {
          conversationId,
          messageId,
        },
        { accountRole: 'admin', userId },
      );
    });
  });

  describe('react to a message', () => {
    it('should add react to a message', () => {
      jest.spyOn(messageLogic, 'addReactionToMessage');

      const reactionDto: ReactionDto = {
        messageId,
        conversationId,
        reaction: ':like',
        reactionUnicode: ':likecode',
      };

      resolver.addReactionToMessage(reactionDto, authenticatedUser);
      expect(messageLogic.addReactionToMessage).toBeCalledWith(reactionDto, {
        accountRole: 'admin',
        userId,
      });
    });
  });

  describe('un-react to a message', () => {
    it('should add react to a message', () => {
      jest.spyOn(messageLogic, 'removeReactionFromMessage');

      const reactionDto: ReactionDto = {
        messageId,
        conversationId,
        reaction: ':like',
        reactionUnicode: ':likecode',
      };

      resolver.removeReactionFromMessage(reactionDto, authenticatedUser);
      expect(messageLogic.removeReactionFromMessage).toBeCalledWith(
        reactionDto,
        {
          accountRole: 'admin',
          userId,
        },
      );
    });
  });

  describe('add poll to message', () => {
    it('should add a poll to a message', () => {
      jest.spyOn(messageLogic, 'create');

      const mockPoll: PollDto = {
        question: 'What does everyone prefer for lunch?',
        options: [
          {
            option: 'Pizaa',
          },
          {
            option: 'Pasta',
          },
          {
            option: 'Burger',
          },
          {
            option: 'Salad',
          },
        ],
        allowMultipleAnswers: false,
      };

      const message: MessageDto = {
        text: '',
        conversationId,
        richContent: {
          poll: mockPoll,
        },
      };

      resolver.sendConversationMessage(message, authenticatedUser);
      expect(messageLogic.create).toBeCalledWith(
        {
          conversationId,
          richContent: {
            poll: mockPoll,
          },
          text: '',
        },
        { accountRole: 'admin', userId },
      );
    });
  });
});

describe('RichMessageContentResolver', () => {
  let resolver: RichMessageContentResolver;
  let messageLogic: MockedChatMessageLogic;

  class MockedSafeguardingService {
    clean(message: string) {
      return message;
    }
  }

  class MockedChatMessageDataLoader implements IChatMessageDataLoader {
    load() {
      return Promise.resolve(chatMessage);
    }

    loadMany() {
      return Promise.resolve([chatMessage]);
    }
  }

  class MockedChatMessageLogic {
    addVote(
      messageId: ObjectID,
      option: string,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }

    removeVote(
      messageId: ObjectID,
      option: string,
      authenticatedUser?: IAuthenticatedUser,
    ): Promise<ChatMessage> {
      return Promise.resolve(chatMessage);
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RichMessageContentResolver,
        { provide: MessageLogic, useClass: MockedChatMessageLogic },
        { provide: SafeguardingService, useClass: MockedSafeguardingService },
        {
          provide: ChatMessageDataLoader,
          useClass: MockedChatMessageDataLoader,
        },
      ],
    }).compile();

    resolver = module.get<RichMessageContentResolver>(
      RichMessageContentResolver,
    );
    messageLogic = module.get<MessageLogic>(MessageLogic);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('addVote', () => {
    it('should be defined', () => {
      expect(resolver.addVote).toBeDefined();
    });

    it('should be able to add a vote', () => {
      // prepare
      jest.spyOn(messageLogic, 'addVote');

      const option = 'option 1';
      resolver.addVote(messageId, option, authenticatedUser);

      // assert
      expect(messageLogic.addVote).toBeCalledWith(
        messageId,
        option,
        authenticatedUser,
      );
    });
  });

  describe('removeVote', () => {
    it('should be defined', () => {
      expect(resolver.removeVote).toBeDefined();
    });

    it('should be able to remove a vote', () => {
      // prepare
      jest.spyOn(messageLogic, 'removeVote');

      const option = 'option 1';
      resolver.removeVote(messageId, option, authenticatedUser);

      // assert
      expect(messageLogic.removeVote).toBeCalledWith(
        messageId,
        option,
        authenticatedUser,
      );
    });
  });
});
