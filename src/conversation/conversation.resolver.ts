import { ObjectID } from 'mongodb';
import {
  Args,
  Query,
  Parent,
  Mutation,
  Resolver,
  ResolveField,
  ResolveReference,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import DataLoader = require('dataloader');

import { ContextType, getUserFromGqlContext } from '../utils/req.utils';
import {
  GqlAuthGuard,
  GqlAuthGuardForReference,
} from '../authentication/GqlAuthGuard';
import {
  AuthenticatedUser,
  IAuthenticatedUser,
} from '../authentication/jwt.strategy';
import { ConversationDTO, ConversationLogic } from './conversation.logic';
import { ChatConversation } from './models/ChatConversation.entity';
import { MarkReadMessageDTO } from './models/markReadMessage.input';
import { LastRead } from './models/LastRead.entity';
import { UnreadCountOutput } from './models/unreadCount.dto';
import { LastMessageOutput } from './models/lastMessage.dto';
import { ChatMessage } from '../message/models/message.entity';
import { pinMessageDTO, unpinMessageDTO } from './models/pinnedMessages.dto';
import { ChatMessageDataLoader } from '../message/message.dataloader';

type ConversationReference = { __typename: string; id: string };

@Resolver(() => ChatConversation)
export class ConversationResolver {
  constructor(
    private conversationLogic: ConversationLogic,
    private chatMessageDataLoader: ChatMessageDataLoader,
  ) {}

  /**
   * Note: GqlAuthGuardForReference patches a bug emerging from @nestjs/graphql
   * wherein the GqlExecutionContext receives just 3 arguments instead of
   * 4 after the context passes from ResolveReference.
   * The sequence of root, context, arg, info has changed into
   * root, arg, context, info. Hence it is essential to put that
   * _arg before the context as the set of arguments in the resolveReference
   **/
  @UseGuards(GqlAuthGuardForReference)
  @ResolveReference()
  resolveReference(
    reference: ConversationReference,
    _args: any, // Dont remove this. Read function docs
    ctx: ContextType,
  ): Promise<ChatConversation> {
    // TODO: Implement data loading
    return this.conversationLogic.getConversation(
      reference.id,
      getUserFromGqlContext(ctx),
    );
  }

  @Query(() => ChatConversation)
  @UseGuards(GqlAuthGuard)
  getChatConversation(
    @Args('id') id: string,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversation> {
    return this.conversationLogic.getConversation(id, authenticatedUser);
  }

  @ResolveField(() => Number)
  @UseGuards(GqlAuthGuard)
  async unreadMessageCount(
    @Parent() conversation: ChatConversation,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<number> {
    // TODO: Redo data loading
    const proxyUnread = (ids: ReadonlyArray<string>) => {
      const conversationIds = ids.map((id) => id);
      return this.conversationLogic.getUnreadMessageCounts({
        userId: authenticatedUser.userId.toHexString(),
        conversationIds,
      });
    };

    const unreadCountLoader = new DataLoader(proxyUnread);
    const unreadCountObject: UnreadCountOutput = await unreadCountLoader.load(
      conversation.id,
    );
    return unreadCountObject.unreadMessageCount;
  }

  @ResolveField(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async lastMessage(
    @Parent() conversation: ConversationDTO,
  ): Promise<ChatMessage | undefined> {
    if (conversation.lastMessageId) {
      return await this.chatMessageDataLoader.load(conversation.lastMessageId);
    }
    return undefined;
  }

  @Mutation(() => LastRead)
  @UseGuards(GqlAuthGuard)
  async recordLastMessageReadByUser(
    @Args('markReadMessageDto') markReadMessageDto: MarkReadMessageDTO,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<LastRead> {
    return await this.conversationLogic.recordLastMessageReadByUser({
      ...markReadMessageDto,
      authenticatedUser,
    });
  }

  @Mutation(() => ChatConversation)
  @UseGuards(GqlAuthGuard)
  async pinMessageInConversation(
    @Args('pinMessageDTO') pinMessageDTO: pinMessageDTO,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversation> {
    return await this.conversationLogic.pinMessage(
      pinMessageDTO,
      authenticatedUser,
    );
  }

  @Mutation(() => ChatConversation)
  @UseGuards(GqlAuthGuard)
  async unpinMessageInConversation(
    @Args('unpinMessageDTO') unpinMessageDTO: unpinMessageDTO,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversation> {
    return await this.conversationLogic.unpinMessage(
      unpinMessageDTO,
      authenticatedUser,
    );
  }

  @ResolveField('pinnedMessages', () => [ChatMessage])
  async pinnedMessages(
    @Parent() conversation: ConversationDTO,
  ): Promise<ChatMessage[]> {
    const pinnedMessages = conversation.pinnedMessages || [];
    return await this.chatMessageDataLoader.loadMany(pinnedMessages);
  }

  @ResolveField('pinnedMessagesCount', () => Number)
  async pinnedMessagesCount(
    @Parent() conversation: ConversationDTO,
  ): Promise<number> {
    const pinnedMessages = conversation.pinnedMessages || [];
    const pinnedMessageCount: number = await (
      await this.chatMessageDataLoader.loadMany(pinnedMessages)
    ).length;
    return pinnedMessageCount;
  }
}
