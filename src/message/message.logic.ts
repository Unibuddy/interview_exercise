import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ChatMessage,
  PaginatedChatMessages,
  PollOption,
  RichMessageContent,
} from './models/message.entity';
import {
  MessageDto,
  GetMessageDto,
  DeleteMessageDto,
  LikeMessageDto,
  ResolveMessageDto,
  ReactionDto,
  PollOptionDto,
} from './models/message.dto';
import { MessageData } from './message.data';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { ForbiddenError } from 'apollo-server-errors';
import { PermissionsService } from '../permissions/permissions.service';
import { Action } from '../permissions/models/permissions.model';
import {
  ConversationChannel,
  SendMessageEvent,
  DeleteMessageEvent,
  LikeMessageEvent,
  UnlikeMessageEvent,
  ResolveMessageEvent,
  UnresolveMessageEvent,
  ReactedMessageEvent,
  UnReactedMessageEvent,
} from '../conversation/conversation-channel.socket';
import { UserService } from '../user/user.service';
import { ConversationData } from '../conversation/conversation.data';
import { SafeguardingService } from '../safeguarding/safeguarding.service';
import { Types } from 'mongoose';
import { ObjectID } from 'mongodb';
import { ConversationLogic } from '../conversation/conversation.logic';
import { UserBlocksLogic } from '../user-blocks/user-blocks.logic';
import {
  ContextSchema,
  ContextType,
} from '../conversation/models/ContextSchema.dto';
import { extractUniversityIdsFromContext } from '../conversation/extractUniversityIdsFromContext';
import { ChatMessageModel } from './models/message.model';
import {
  MessageGroupedByConversationOutput,
  MessagesFilterInput,
} from '../conversation/models/messagesFilterInput';

export interface IMessageLogic {
  create(
    messageDto: MessageDto,
    authenticatedUser?: IAuthenticatedUser,
  ): Promise<ChatMessage>;
  getChatConversationMessages(
    getMessageDto: GetMessageDto,
    authenticatedUser?: IAuthenticatedUser,
  ): Promise<PaginatedChatMessages>;
  resolve(
    resolveMessageDto: ResolveMessageDto,
    authenticatedUser?: IAuthenticatedUser,
  ): Promise<ChatMessage>;
  getMessagesByConversation(
    messagesFilterInput: MessagesFilterInput,
  ): Promise<MessageGroupedByConversationOutput[]>;
}

@Injectable()
export class MessageLogic implements IMessageLogic {
  constructor(
    @Inject(forwardRef(() => ConversationLogic))
    private conversationLogic: ConversationLogic,
    private messageData: MessageData,
    private permissions: PermissionsService,
    private conversationChannel: ConversationChannel,
    private userService: UserService,
    private conversationData: ConversationData,
    private safeguardingService: SafeguardingService,
    private userBlocks: UserBlocksLogic,
  ) {}

  async create(
    messageDto: MessageDto,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId: String(messageDto.conversationId),
        action: Action.sendMessage,
      }))
    ) {
      throw new ForbiddenError(`User is not authorised to send this message`);
    }

    if (messageDto.richContent?.poll) {
      if (
        !(await this.permissions.conversationPermissions({
          user: authenticatedUser,
          conversationId: String(messageDto.conversationId),
          action: Action.createPoll,
        }))
      ) {
        throw new ForbiddenError(`User is not authorised to create a poll`);
      }
    }

    const { userId, accountRole } = authenticatedUser;

    const conversationId = messageDto.conversationId.toHexString();
    const [message, sender, conversation] = await Promise.all([
      this.messageData.create(messageDto, userId),
      this.userService.getUser(userId.toHexString()),
      this.conversationData.getConversation(conversationId),
    ]);

    // Mark this message as the last message in the conversation
    await this.conversationData.updateConversationWithLastMessage(
      conversationId,
      message.id,
    );

    // Register the lastRead for the current user
    // The person who sent this message has obviously read it
    await this.conversationData.recordLastMessageReadByUser({
      conversationId,
      messageId: message.id,
      authenticatedUser,
    });

    const sendMessageEvent = new SendMessageEvent({
      id: message.id,
      text: this.safeguardingService.clean(message.text),
      created: message.created,
      sender: {
        id: sender.id,
        firstName: sender.firstName,
        profilePhoto: sender.profilePhoto,
        accountRole,
      },
      deleted: message.deleted,
      likes: message.likes,
      likesCount: message.likesCount,
      richContent: await this.mapRichContent(messageDto, message),
      resolved: message.resolved,
      isSenderBlocked: false,
    });

    this.conversationChannel.send(sendMessageEvent, conversationId);
    sender.accountRole = accountRole;

    return message;
  }

  private async mapRichContent(
    messageDto: MessageDto,
    message: ChatMessageModel,
  ): Promise<RichMessageContent | undefined> {
    let richContent: RichMessageContent | undefined;
    if (message.richContent?.reply) {
      const replyMessage = await this.messageData.getMessage(
        message.richContent.reply.id.toHexString(),
      );

      if (replyMessage) {
        const user = await this.userService.getUser(
          replyMessage.senderId.toHexString(),
        );

        richContent = {
          reply: {
            id: replyMessage.id,
            text: this.safeguardingService.clean(replyMessage.text),
            created: replyMessage.created,
            deleted: replyMessage.deleted,
            richContent: replyMessage?.richContent || undefined,
            sender: {
              id: user.id,
              firstName: user.firstName,
              accountRole: user.accountRole,
              profilePhoto: user.profilePhoto,
            },
          },
        };
      }
    }

    if (messageDto.richContent?.giphy) {
      const { id, type, width, height, aspectRatio } =
        messageDto.richContent.giphy;

      const trimmedAspectRatio = Number(aspectRatio.toPrecision(3));

      richContent = {
        ...(richContent || {}),
        giphy: { id, type, width, height, aspectRatio: trimmedAspectRatio },
      };
    }

    if (messageDto.richContent?.images) {
      richContent = {
        ...(richContent || {}),
        images: messageDto.richContent.images,
      };
    }

    if (messageDto.richContent?.attachments) {
      richContent = {
        ...(richContent || {}),
        attachments: messageDto.richContent.attachments,
      };
    }

    if (messageDto.richContent?.poll) {
      richContent = {
        ...(richContent || {}),
        poll: messageDto.richContent.poll,
      };
    }

    return richContent;
  }

  async getMessage(messageId: ObjectID, authenticatedUser: IAuthenticatedUser) {
    if (
      !(await this.permissions.messagePermissions({
        user: authenticatedUser,
        messageId: messageId.toHexString(),
        action: Action.sendMessage,
      }))
    ) {
      console.error(
        `User ${
          authenticatedUser.userId
        } is not authorised to read message ${messageId.toHexString()}`,
      );
      throw new ForbiddenError(`User is not authorised to read this message`);
    }

    return this.messageData.getMessage(messageId.toHexString());
  }

  private async getBlockedUserIds(
    contexts: ContextSchema[],
    paginatedChatMessages: PaginatedChatMessages,
    conversationId: ObjectID,
  ): Promise<ObjectID[]> {
    const isDirectConversation =
      this.conversationLogic.isDirectConversation(contexts);
    const userIds = paginatedChatMessages.messages
      .map((message) => new ObjectID(message.sender.id))
      .filter(
        (userId, index, allUserIds) => allUserIds.indexOf(userId) === index,
      );
    let blockedScope = {
      scopeId: new ObjectID(String(conversationId)),
      scope: ContextType.isDirectConversation,
    };
    if (!isDirectConversation) {
      // Scope is not-nullable -> getting universityId from conversation context instead of authenticatedUser
      const universityIds = extractUniversityIdsFromContext({
        conversationContext: contexts,
      });
      if (!universityIds || universityIds.length === 0)
        throw new Error('University not found to get conversation messages');
      const universityId = universityIds[0];
      blockedScope = {
        scopeId: new ObjectID(String(universityId)),
        scope: ContextType.university,
      };
    }

    const blockedUsers = await this.userBlocks.getBlockedUsers(
      userIds,
      blockedScope,
    );
    return blockedUsers.map((user) => user.blockedUserId);
  }


  async getChatConversationMessages(
    getMessageDto: GetMessageDto,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<PaginatedChatMessages> {
    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId: String(getMessageDto.conversationId),
        action: Action.readConversation,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to read this conversation`,
      );
    }

    const [paginatedChatMessages, conversation] = await Promise.all([
      this.messageData.getChatConversationMessages(getMessageDto),
      this.conversationLogic.getConversation(
        String(getMessageDto.conversationId),
        authenticatedUser,
      ),
    ]);

    const blockedUserIds = await this.getBlockedUserIds(
      conversation.context,
      paginatedChatMessages,
      getMessageDto.conversationId,
    );

    paginatedChatMessages.messages = this.setIsSenderBlockedTrue(
      paginatedChatMessages,
      blockedUserIds,
    );
  

    return paginatedChatMessages;
  }

  async getMessagesByConversation(messagesFilterInput: MessagesFilterInput) {
    const { conversationIds, startDate, endDate } = messagesFilterInput;
    return await this.messageData.getMessagesGroupedByConversation(
      conversationIds.map((id) => new Types.ObjectId(id)),
      startDate,
      endDate,
    );
  }

  private setIsSenderBlockedTrue(
    chatMessages: PaginatedChatMessages,
    blockedUserIds: ObjectID[],
  ): ChatMessage[] {
    const messagesWithBlockedFlag = chatMessages.messages.map((message) => {
      if (blockedUserIds.some((i) => i.toHexString() === message.sender.id)) {
        return { ...message, isSenderBlocked: true };
      }
      return message;
    });
    return messagesWithBlockedFlag;
  }

  async delete(
    deleteMessageDto: DeleteMessageDto,
    authenticatedUser: IAuthenticatedUser,
  ) {
    if (
      !(await this.permissions.messagePermissions({
        user: authenticatedUser,
        messageId: String(deleteMessageDto.messageId),
        action: Action.deleteMessage,
      }))
    ) {
      throw new ForbiddenError(`User is not authorised to delete this message`);
    }

    const message = await this.messageData.delete(deleteMessageDto.messageId);

    const deleteMessageEvent = new DeleteMessageEvent({
      id: message.id,
    });

    this.conversationChannel.send(
      deleteMessageEvent,
      deleteMessageDto.conversationId.toHexString(),
    );

    return message;
  }

  async resolve(
    resolveMessageDto: ResolveMessageDto,
    authenticatedUser?: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    if (!authenticatedUser) {
      throw new ForbiddenError('User is not authenticated');
    }

    if (
      !(await this.permissions.messagePermissions({
        user: authenticatedUser,
        messageId: String(resolveMessageDto.messageId),
        action: Action.resolveMessage,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to resolve this message`,
      );
    }

    const message = await this.messageData.resolve(resolveMessageDto.messageId);

    const resolveMessageEvent = new ResolveMessageEvent({
      id: message.id,
    });

    this.conversationChannel.send(
      resolveMessageEvent,
      resolveMessageDto.conversationId.toHexString(),
    );

    return message;
  }

  async unresolve(
    resolveMessageDto: ResolveMessageDto,
    authenticatedUser?: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    if (!authenticatedUser) {
      throw new ForbiddenError('User is not authenticated');
    }

    if (
      !(await this.permissions.messagePermissions({
        user: authenticatedUser,
        messageId: String(resolveMessageDto.messageId),
        action: Action.resolveMessage,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to resolve this message`,
      );
    }

    const message = await this.messageData.unresolve(
      resolveMessageDto.messageId,
    );

    const unresolveMessageEvent = new UnresolveMessageEvent({
      id: message.id,
    });

    this.conversationChannel.send(
      unresolveMessageEvent,
      resolveMessageDto.conversationId.toHexString(),
    );

    return message;
  }

  async like(
    likeMessageDto: LikeMessageDto,
    authenticatedUser: IAuthenticatedUser,
  ) {
    await this.throwForbiddenErrorIfNotAuthorized(
      authenticatedUser,
      likeMessageDto.messageId,
      Action.readConversation,
    );

    const message = await this.messageData.like(
      likeMessageDto.userId,
      likeMessageDto.messageId,
    );

    const likeMessageEvent = new LikeMessageEvent({
      userId: likeMessageDto.userId,
      messageId: likeMessageDto.messageId,
    });
    this.conversationChannel.send(
      likeMessageEvent,
      likeMessageDto.conversationId.toHexString(),
    );

    return message;
  }

  async unlike(
    likeMessageDto: LikeMessageDto,
    authenticatedUser: IAuthenticatedUser,
  ) {
    await this.throwForbiddenErrorIfNotAuthorized(
      authenticatedUser,
      likeMessageDto.messageId,
      Action.readConversation,
    );

    const message = await this.messageData.unlike(
      likeMessageDto.userId,
      likeMessageDto.messageId,
    );

    const unlikeMessageEvent = new UnlikeMessageEvent({
      userId: likeMessageDto.userId,
      messageId: likeMessageDto.messageId,
    });
    this.conversationChannel.send(
      unlikeMessageEvent,
      likeMessageDto.conversationId.toHexString(),
    );

    return message;
  }

  private async throwForbiddenErrorIfNotAuthorized(
    authenticatedUser: IAuthenticatedUser,
    messageId: ObjectID,
    action: Action,
  ): Promise<void> {
    const result = await this.permissions.messagePermissions({
      user: authenticatedUser,
      messageId: String(messageId),
      action,
    });

    if (!result) {
      throw new ForbiddenError('User is not authorised to perform this action');
    }
  }

  async addReactionToMessage(
    reaction: ReactionDto,
    authenticatedUser: IAuthenticatedUser,
  ) {
    await this.throwForbiddenErrorIfNotAuthorized(
      authenticatedUser,
      reaction.messageId,
      Action.readConversation,
    );

    const message = await this.messageData.addReaction(
      reaction.reaction,
      authenticatedUser.userId,
      reaction.reactionUnicode,
      reaction.messageId,
    );

    const messageEvent = new ReactedMessageEvent({
      userId: authenticatedUser.userId,
      messageId: reaction.messageId,
      reaction: reaction.reaction,
      reactionUnicode: reaction.reactionUnicode,
    });
    this.conversationChannel.send(
      messageEvent,
      reaction.conversationId.toHexString(),
    );

    return message;
  }

  async removeReactionFromMessage(
    reaction: ReactionDto,
    authenticatedUser: IAuthenticatedUser,
  ) {
    await this.throwForbiddenErrorIfNotAuthorized(
      authenticatedUser,
      reaction.messageId,
      Action.readConversation,
    );

    const message = await this.messageData.removeReaction(
      reaction.reaction,
      authenticatedUser.userId,
      reaction.messageId,
    );

    const messageEvent = new UnReactedMessageEvent({
      userId: authenticatedUser.userId,
      messageId: reaction.messageId,
      reaction: reaction.reaction,
      reactionUnicode: reaction.reactionUnicode,
    });
    this.conversationChannel.send(
      messageEvent,
      reaction.conversationId.toHexString(),
    );

    return message;
  }

  async listByKeys(ids: ObjectID[]): Promise<ChatMessage[]> {
    return this.messageData.getMessages(ids);
  }

  async addVote(
    chatMessageId: ObjectID,
    option: string,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    await this.throwForbiddenErrorIfNotAuthorized(
      authenticatedUser,
      chatMessageId,
      Action.readConversation,
    );

    const message = await this.messageData.getMessage(
      chatMessageId.toHexString(),
    );

    const pollOption = this.validateOption(message, option);

    // Check if user is trying to vote for the same option again
    if (pollOption.votes) {
      const votes = new Set();
      pollOption.votes.forEach((vote) => {
        votes.add(vote.toHexString());
      });

      const hasUserVoted = votes.has(authenticatedUser.userId.toHexString());

      if (hasUserVoted) {
        throw new Error(`You have already voted for option: ${option}`);
      }
    }

    // If poll is single vote option throw an error if user has voted for different option
    if (!message.richContent?.poll?.allowMultipleAnswers) {
      const users = new Set();
      message.richContent?.poll?.options.forEach(
        (pollOption: PollOptionDto) => {
          pollOption.votes?.forEach((vote) => {
            users.add(vote.toHexString());
          });
        },
      );

      if (users.has(authenticatedUser.userId.toHexString())) {
        throw new Error(
          `You can not vote for multiple options with allowMultipleAnswers: ${message.richContent?.poll?.allowMultipleAnswers}`,
        );
      }
    }

    return await this.messageData.addVote(
      chatMessageId,
      authenticatedUser.userId,
      option,
    );
  }

  async removeVote(
    chatMessageId: ObjectID,
    option: string,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatMessage> {
    await this.throwForbiddenErrorIfNotAuthorized(
      authenticatedUser,
      chatMessageId,
      Action.readConversation,
    );

    const message = await this.messageData.getMessage(
      chatMessageId.toHexString(),
    );

    const pollOption = this.validateOption(message, option);

    if (pollOption.votes === undefined) {
      throw new Error(
        `Unable to remove your vote from an option you haven't voted for`,
      );
    }

    // Check if user is trying to remove vote for the same option again
    if (pollOption.votes) {
      const votes = new Set();
      pollOption.votes.forEach((vote) => {
        votes.add(vote.toHexString());
      });

      const hasUserVoted = votes.has(authenticatedUser.userId.toHexString());

      if (!hasUserVoted) {
        throw new Error(
          `Unable to remove your vote from an option you haven't voted for`,
        );
      }
    }

    return await this.messageData.removeVote(
      chatMessageId,
      authenticatedUser.userId,
      option,
    );
  }

  private validateOption(
    message: ChatMessageModel,
    option: string,
  ): PollOption {
    // Get the option index for input Option
    const optionIndex = message.richContent?.poll?.options.findIndex(
      (pollOption) => pollOption.option === option,
    );

    if (optionIndex === -1 || optionIndex === undefined) {
      throw new Error(`Option "${option}" not found in the poll`);
    }

    // Get the poll option which has {option and votes}
    const pollOption = message.richContent?.poll?.options[optionIndex];

    if (!pollOption) {
      throw new Error(`Option "${option}" not found in the poll`);
    }

    return pollOption;
  }
}
