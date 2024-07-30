import { UseGuards } from '@nestjs/common';
import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../authentication/GqlAuthGuard';
import {
  AuthenticatedUser,
  IAuthenticatedUser,
} from '../authentication/jwt.strategy';
import { ConversationLogic } from '../conversation/conversation.logic';
import { ChatConversation } from '../conversation/models/ChatConversation.entity';
import { ConversationInbox } from './models/conversation-inbox.entity';

@Resolver(() => ConversationInbox)
export class ConversationInboxResolver {
  constructor(private conversationLogic: ConversationLogic) {}

  @UseGuards(GqlAuthGuard)
  @ResolveField(() => [ChatConversation])
  async conversations(
    @AuthenticatedUser() user: IAuthenticatedUser,
    @Parent() conversationInbox: ConversationInbox,
  ): Promise<ChatConversation[]> {
    const { contexts } = conversationInbox;
    return this.conversationLogic.getConversationsForInbox(user, contexts);
  }

  /**
   * This method is here so that the schema picks up the ConversationInbox type
   * Without it, we do not get the auto generated types in the schema file
   *
   * @deprecated
   */
  @Query(() => [ConversationInbox], {
    deprecationReason: 'Do not use query. See implementation for more details.',
  })
  conversationInboxDoNotUse(): ConversationInbox[] {
    return [];
  }
}
