import {
  Resolver,
  Mutation,
  Query,
  Args,
  ResolveField,
  Parent,
  ResolveReference,
} from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import {
  ChatMessage,
  PaginatedChatMessages,
  Poll,
  RichMessageContent,
} from './models/message.entity';
import {
  MessageDto,
  GetMessageDto,
  DeleteMessageDto,
  LikeMessageDto,
  ResolveMessageDto,
  ReactionDto,
} from './models/message.dto';
import { MessageLogic } from './message.logic';
import {
  GqlAuthGuard,
  GqlAuthGuardForReference,
} from '../authentication/GqlAuthGuard';
import { UseGuards } from '@nestjs/common';
import {
  AuthenticatedUser,
  IAuthenticatedUser,
} from '../authentication/jwt.strategy';
import { SafeguardingService } from '../safeguarding/safeguarding.service';
import { ChatMessageDataLoader } from './message.dataloader';

type ChatMessageReference = { __typename: string; id: ObjectId };

@Resolver(() => ChatMessage)
export class MessageResolver {
  constructor(
    private messageLogic: MessageLogic,
    private safeguardingService: SafeguardingService,
    private chatMessageDataLoader: ChatMessageDataLoader,
  ) {}

  @UseGuards(GqlAuthGuardForReference)
  @ResolveReference()
  async resolveReference(
    reference: ChatMessageReference,
  ): Promise<ChatMessage> {
    return this.chatMessageDataLoader.load(reference.id);
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async sendConversationMessage(
    @Args('messageDto') messageDto: MessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    return await this.messageLogic.create(messageDto, authenticatedUser);
  }

  @Query(() => [ChatMessage], {
    deprecationReason:
      'This query has now been deprecated, please use getChatConversationMessages',
  })
  @UseGuards(GqlAuthGuard)
  async getMessagesForChatConversation(
    @Args('getMessageDto') getMessageDto: GetMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage[]> {
    const result = await this.messageLogic.getChatConversationMessages(
      getMessageDto,
      authenticatedUser,
    );
    return result.messages;
  }

  @Query(() => PaginatedChatMessages)
  @UseGuards(GqlAuthGuard)
  async getChatConversationMessages(
    @Args('getMessageDto') getMessageDto: GetMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<PaginatedChatMessages> {
    return await this.messageLogic.getChatConversationMessages(
      getMessageDto,
      authenticatedUser,
    );
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async deleteConversationMessage(
    @Args('deleteMessageDto') deleteMessageDto: DeleteMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    return await this.messageLogic.delete(deleteMessageDto, authenticatedUser);
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async resolveConversationMessage(
    @Args('resolveMessageDto') resolveMessageDto: ResolveMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    return await this.messageLogic.resolve(
      resolveMessageDto,
      authenticatedUser,
    );
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async unresolveConversationMessage(
    @Args('resolveMessageDto') resolveMessageDto: ResolveMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    return await this.messageLogic.unresolve(
      resolveMessageDto,
      authenticatedUser,
    );
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async likeConversationMessage(
    @Args('likeMessageDto') likeMessageDto: LikeMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    return await this.messageLogic.like(likeMessageDto, authenticatedUser);
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async unlikeConversationMessage(
    @Args('likeMessageDto') likeMessageDto: LikeMessageDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    return await this.messageLogic.unlike(likeMessageDto, authenticatedUser);
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async addReactionToMessage(
    @Args('reactionDto') reactionDto: ReactionDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ) {
    return this.messageLogic.addReactionToMessage(
      reactionDto,
      authenticatedUser,
    );
  }

  @Mutation(() => ChatMessage)
  @UseGuards(GqlAuthGuard)
  async removeReactionFromMessage(
    @Args('reactionDto') reactionDto: ReactionDto,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ) {
    return this.messageLogic.removeReactionFromMessage(
      reactionDto,
      authenticatedUser,
    );
  }

  @ResolveField()
  text(@Parent() message: ChatMessage): string {
    return this.safeguardingService.clean(message.text);
  }
}

@Resolver(() => RichMessageContent)
export class RichMessageContentResolver {
  constructor(
    private chatMessageDataLoader: ChatMessageDataLoader,
    private messageLogic: MessageLogic,
  ) {}

  @ResolveField('reply', () => ChatMessage, { nullable: true })
  async getReplyMessage(
    @Parent() richMessageContent: RichMessageContent,
  ): Promise<ChatMessage | undefined> {
    const messageId = richMessageContent.reply?.id;
    if (!messageId) return undefined;
    return await this.chatMessageDataLoader.load(messageId);
  }

  @Mutation(() => Poll)
  @UseGuards(GqlAuthGuard)
  async addVote(
    @Args('chatMessageId') chatMessageId: ObjectId,
    @Args('option') option: string,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<Poll | undefined> {
    const response = await this.messageLogic.addVote(
      chatMessageId,
      option,
      authenticatedUser,
    );

    return response.richContent?.poll;
  }

  @Mutation(() => Poll)
  @UseGuards(GqlAuthGuard)
  async removeVote(
    @Args('chatMessageId') chatMessageId: ObjectId,
    @Args('option') option: string,
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<Poll | undefined> {
    const response = await this.messageLogic.removeVote(
      chatMessageId,
      option,
      authenticatedUser,
    );

    return response.richContent?.poll;
  }
}
