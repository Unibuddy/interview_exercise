import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { AddMemberDTO } from '../conversation/models/AddMember.dto';
import {
  Context,
  ContextType,
  Product,
} from '../conversation/models/ContextSchema.dto';
import { ChatConversationModel } from '../conversation/models/conversation.model';
import {
  CreateChatConversationDto,
  Tag,
} from '../conversation/models/CreateChatConversation.dto';
import {
  LastMessageInput,
  LastMessageOutput,
} from '../conversation/models/lastMessage.dto';
import { LastRead } from '../conversation/models/LastRead.entity';
import { LastReadInput } from '../conversation/models/LastReadInput.dto';
import { Permission } from '../conversation/models/Permission.dto';
import {
  pinMessageDTO,
  unpinMessageDTO,
} from '../conversation/models/pinnedMessages.dto';
import {
  UnreadCountInput,
  UnreadCountOutput,
} from '../conversation/models/unreadCount.dto';
import {
  ConversationLogic,
  IConversationLogic,
} from '../conversation/conversation.logic';
import { ConversationInboxResolver } from './conversation-inbox.resolver';
import {
  MessagesFilterInput,
  MessageGroupedByConversationOutput,
} from '../conversation/models/messagesFilterInput';

class ConversationLogicMocked implements IConversationLogic {
  getConversation(
    id: string,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented.');
  }
  getConversationsForInbox(
    authenticatedUser: IAuthenticatedUser,
    contexts: Context[],
  ): Promise<ChatConversationModel[]> {
    throw new Error('Method not implemented.');
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
    pinMessageDTO: pinMessageDTO,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented.');
  }
  unpinMessage(
    unpinMessageDTO: unpinMessageDTO,
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
    createChatConversationDto: CreateChatConversationDto,
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented.');
  }
  migratePermissions(
    chatPermissionsDto: Permission[],
    product: Product,
    conversationIds: string[],
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
  recordLastMessageReadByUser(lastReadInput: LastReadInput): Promise<LastRead> {
    throw new Error('Method not implemented.');
  }
  getLastRead(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<LastRead> {
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
  updateTags(
    conversationId: string,
    tags: Tag[],
  ): Promise<ChatConversationModel> {
    throw new Error('Method not implemented.');
  }
  getMessagesByConversation(
    messagesFilterInput: MessagesFilterInput,
  ): Promise<MessageGroupedByConversationOutput[]> {
    return Promise.resolve([]);
  }
}

describe('Conversation Inbox Resolver', () => {
  let resolver: ConversationInboxResolver;
  let conversationLogic: ConversationLogic;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationInboxResolver,
        { provide: ConversationLogic, useClass: ConversationLogicMocked },
      ],
    }).compile();

    resolver = module.get<ConversationInboxResolver>(ConversationInboxResolver);
    conversationLogic = module.get<ConversationLogic>(ConversationLogic);
  });

  it('conversation field resolver calls the logic layer', async () => {
    const userId = new ObjectId('321b1a570ff321b1a570ff01');
    const authenticatedUser: IAuthenticatedUser = {
      userId,
      accountRole: 'university',
      universityId: new ObjectId('321b1a570ff321b1a570ff02'),
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
      lastMessageId: new ObjectId('321b1a570ff321b1a570ff05'),
    };
    jest.spyOn(conversationLogic, 'getConversationsForInbox').mockReturnValue(
      new Promise((resolve) => {
        resolve([testConversation]);
      }),
    );

    const result = await resolver.conversations(authenticatedUser, {
      contexts: [context],
      conversations: [],
    });

    expect(result.length).toEqual(1);
    expect(result[0].id).toEqual('321b1a570ff321b1a570ff04');
  });
});
