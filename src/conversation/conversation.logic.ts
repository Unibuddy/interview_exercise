import { DirectConversationDefaultPermissions } from './dto/DirectConversationDefaultPermission';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ForbiddenError, UserInputError } from 'apollo-server-express';
import { ObjectID } from 'mongodb';

import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { PermissionsService } from '../permissions/permissions.service';
import { Action } from '../permissions/models/permissions.model';

import { Permission } from './models/Permission.dto';
import {
  Context,
  ContextSchema,
  ContextType,
  Product,
} from './models/ContextSchema.dto';
import { UnreadCountInput, UnreadCountOutput } from './models/unreadCount.dto';
import { LastMessageInput, LastMessageOutput } from './models/lastMessage.dto';
import { LastRead } from './models/LastRead.entity';
import { LastReadInput } from './models/LastReadInput.dto';
import { ConversationData } from './conversation.data';
import {
  CreateChatConversationDto,
  Tag,
} from './models/CreateChatConversation.dto';
import { AddMemberDTO } from './models/AddMember.dto';
import { pinMessageDTO, unpinMessageDTO } from './models/pinnedMessages.dto';
import { ChatConversationModel } from './models/conversation.model';
import { MessageLogic } from '../message/message.logic';
import {
  ConversationChannel,
  PinMessageEvent,
  UnpinMessageEvent,
  UserJoinedConversationEvent,
  UserLeftConversationEvent,
} from './conversation-channel.socket';
import { SafeguardingService } from '../safeguarding/safeguarding.service';
import { UserService } from '../user/user.service';
import { RichMessageContent } from '../message/models/message.entity';
import { DirectChatConversationDto } from './dto/DirectChatConversationDto';
import {
  MessageGroupedByConversationOutput,
  MessagesFilterInput,
} from './models/messagesFilterInput';

export interface IConversationLogic {
  getConversation(
    id: string,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ConversationDTO>;
  getConversationsForInbox(
    authenticatedUser: IAuthenticatedUser,
    contexts: Context[],
  ): Promise<ConversationDTO[]>;
  removeMember(
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationModel>;
  addMember(
    conversationId: string,
    addMember: AddMemberDTO,
  ): Promise<ChatConversationModel>;
  pinMessage(
    pinMessageDTO: pinMessageDTO,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversationModel>;
  unpinMessage(
    unpinMessageDTO: unpinMessageDTO,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversationModel>;
  blockMember(conversationIds: string[], memberId: string): Promise<void>;
  unblockMember(conversationIds: string[], memberId: string): Promise<void>;
  create(
    createChatConversationDto: CreateChatConversationDto,
  ): Promise<ConversationDTO>;
  migratePermissions(
    chatPermissionsDto: Permission[],
    product: Product,
    conversationIds: string[],
  ): Promise<void>;
  recordLastMessageReadByUser(lastReadInput: LastReadInput): Promise<LastRead>;
  getLastRead(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<LastRead>;
  getUnreadMessageCounts(
    unreadCountInput: UnreadCountInput,
  ): Promise<UnreadCountOutput[]>;
  getUnreadCountInConversation(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<number>;
  getLastMessages(
    lastMessageInput: LastMessageInput,
  ): Promise<LastMessageOutput[]>;
  updateTags(conversationId: string, tags: Tag[]): Promise<ConversationDTO>;
  getMessagesByConversation(
    messagesFilterInput: MessagesFilterInput,
  ): Promise<MessageGroupedByConversationOutput[]>;
}

export type ConversationDTO = ChatConversationModel;

@Injectable()
export class ConversationLogic implements IConversationLogic {
  constructor(
    private conversationData: ConversationData,
    private permissions: PermissionsService,
    private messageLogic: MessageLogic,
    private conversationChannel: ConversationChannel,
    private safeguardingService: SafeguardingService,
    private userService: UserService,
  ) {}

  async getConversation(
    id: string,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ConversationDTO> {
    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId: id,
        action: Action.readConversation,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to view this conversation`,
      );
    }
    return this.conversationData.getConversation(id);
  }

  isDirectConversation(contexts: ContextSchema[]): boolean {
    const directConversationContext = contexts.find(
      (context) => context.type === ContextType.isDirectConversation,
    );

    return directConversationContext != null;
  }

  async getConversationsForInbox(
    authenticatedUser: IAuthenticatedUser,
    contexts: Context[],
  ): Promise<ConversationDTO[]> {
    // TODO: we should probably add a permissions check here
    return this.conversationData.getConversationsForInbox(
      authenticatedUser.userId.toHexString(),
      contexts,
    );
  }

  async removeMember(
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationModel> {
    const member = await this.userService.getUser(memberId);

    const userLeftEvent = new UserLeftConversationEvent(member);

    this.conversationChannel.send(userLeftEvent, conversationId);

    return this.conversationData.removeMember(conversationId, memberId);
  }

  async addMember(
    conversationId: string,
    addMember: AddMemberDTO,
  ): Promise<ChatConversationModel> {
    const member = await this.userService.getUser(addMember.userId);

    const userJoinedEvent = new UserJoinedConversationEvent(member);

    this.conversationChannel.send(userJoinedEvent, conversationId);

    return this.conversationData.addMember(conversationId, addMember);
  }

  async pinMessage(
    pinMessageDTO: pinMessageDTO,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversationModel> {
    const { conversationId, messageId } = pinMessageDTO;

    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId,
        action: Action.pinMessage,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to pin a message to this conversation`,
      );
    }

    // Check conversation exists
    try {
      await this.conversationData.getConversation(conversationId);
    } catch (error) {
      throw new UserInputError('Cannot pin message: conversation not found');
    }

    await this.sendPinMessageEvent(
      authenticatedUser,
      new ObjectID(conversationId),
      messageId,
    );

    return await this.conversationData.pinMessage(conversationId, messageId);
  }

  async unpinMessage(
    unpinMessageDTO: unpinMessageDTO,
    authenticatedUser: IAuthenticatedUser,
  ): Promise<ChatConversationModel> {
    const { conversationId, messageId } = unpinMessageDTO;

    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId,
        action: Action.pinMessage,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to unpin a message from this conversation`,
      );
    }

    // Check conversation exists
    try {
      await this.conversationData.getConversation(conversationId);
    } catch (error) {
      throw new UserInputError('Cannot unpin message: conversation not found');
    }

    const unpinMessageEvent = new UnpinMessageEvent({ id: messageId });

    this.conversationChannel.send(unpinMessageEvent, conversationId);

    return await this.conversationData.unpinMessage(conversationId, messageId);
  }

  async blockMember(
    conversationIds: string[],
    memberId: string,
  ): Promise<void> {
    await this.conversationData.blockMember(conversationIds, memberId);
    console.log(
      `User ${memberId} successfully blocked from conversations: ${conversationIds}`,
    );
  }

  async unblockMember(
    conversationIds: string[],
    memberId: string,
  ): Promise<void> {
    await this.conversationData.unblockMember(conversationIds, memberId);
    console.log(
      `User ${memberId} successfully unblocked from conversations: ${conversationIds}`,
    );
  }

  async create(
    createChatConversationDto: CreateChatConversationDto,
  ): Promise<ConversationDTO> {
    return this.conversationData.create(createChatConversationDto);
  }

  async getExistingDirectConversation(
    memberIds: string[],
  ): Promise<ChatConversationModel | null> {
    // find if there is direct conversation exists between given two userIds
    return this.conversationData.getConversationByAllMemberIdsAndContext(
      memberIds,
      [new ContextSchema(true, ContextType.isDirectConversation)],
    );
  }

  async createDirectChatConversation(
    directChatConversationDto: DirectChatConversationDto,
  ): Promise<ConversationDTO> {

    const memberIds = [
      directChatConversationDto.userToConverseWith,
      directChatConversationDto.currentUserId,
    ];

    // find if there is direct conversation exists between given two userIds
    const conversation = await this.getExistingDirectConversation(memberIds);
    if (conversation) {
      // return existing conversation
      return conversation;
    }

    // when existing not found create a new one
    const model = new ChatConversationModel();
    model.context = directChatConversationDto.context
      ? directChatConversationDto.context
      : [];
    this.setDirectMessageContextIfNeeded(model.context);
    model.product = directChatConversationDto.product;
    model.memberIds = memberIds;
    model.permissions = DirectConversationDefaultPermissions;
    return this.conversationData.createChatConversation(model);
  }

  private setDirectMessageContextIfNeeded(context: ContextSchema[]) {
    const directConversationContext = context?.find(
      (cntx) => cntx.type === ContextType.isDirectConversation,
    );
    if (!directConversationContext) {
      context.push(new ContextSchema(true, ContextType.isDirectConversation));
    }
  }

  async migratePermissions(
    chatPermissionsDto: Permission[],
    product: Product,
    conversationIds: string[],
  ): Promise<void> {
    this.conversationData.migratePermissions(
      chatPermissionsDto,
      product,
      conversationIds,
    );
  }

  async recordLastMessageReadByUser({
    conversationId,
    messageId,
    authenticatedUser,
  }: LastReadInput): Promise<LastRead> {
    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId: conversationId,
        action: Action.readConversation,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to read this conversation`,
      );
    }
    return this.conversationData.recordLastMessageReadByUser({
      conversationId,
      messageId,
      authenticatedUser,
    });
  }

  async getLastRead(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<LastRead> {
    return await this.conversationData.getLastRead(
      authenticatedUser,
      conversationId,
    );
  }

  /* Finds unread message counts across all conversations for a user */
  async getUnreadMessageCounts(
    unreadCountInput: UnreadCountInput,
  ): Promise<UnreadCountOutput[]> {
    return this.conversationData.getUnreadMessageCounts(unreadCountInput);
  }

  /* Finds unread message counts in a single conversation for a user */
  async getUnreadCountInConversation(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<number> {
    if (
      !(await this.permissions.conversationPermissions({
        user: authenticatedUser,
        conversationId: conversationId,
        action: Action.readConversation,
      }))
    ) {
      throw new ForbiddenError(
        `User is not authorised to view this conversation`,
      );
    }
    return this.conversationData.getUnreadCountInConversation(
      authenticatedUser.userId.toHexString(),
      conversationId,
    );
  }

  /* lists lastMessage(s) across all conversations for a user
   * to be used by dataloader to load lastMessage in conversation */
  async getLastMessages(
    lastMessageInput: LastMessageInput,
  ): Promise<LastMessageOutput[]> {
    return this.conversationData.getLastMessages(lastMessageInput);
  }

  async updateTags(
    conversationId: string,
    tags: Tag[],
  ): Promise<ConversationDTO> {
    try {
      const updatedRecord = await this.conversationData.updateTags(
        conversationId,
        tags,
      );
      return updatedRecord;
    } catch (error) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
  }

  private async sendPinMessageEvent(
    authenticatedUser: IAuthenticatedUser,
    conversationId: ObjectID,
    messageId: ObjectID,
  ) {
    const message = await this.messageLogic.getMessage(
      messageId,
      authenticatedUser,
    );
    const sender = await this.userService.getUser(
      message.senderId.toHexString(),
    );

    let richContent: RichMessageContent | undefined;
    if (message.richContent?.reply) {
      const replyMessage = await this.messageLogic.getMessage(
        message.richContent.reply.id,
        authenticatedUser,
      );

      if (replyMessage) {
        const replyMessageUser = await this.userService.getUser(
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
              id: replyMessageUser.id,
              firstName: replyMessageUser.firstName,
              accountRole: replyMessageUser.accountRole,
              profilePhoto: replyMessageUser.profilePhoto,
            },
          },
        };
      }
    }

    if (message.richContent?.giphy) {
      const { id, type, width, height, aspectRatio } =
        message.richContent.giphy;

      const trimmedAspectRatio = Number(aspectRatio.toPrecision(3));

      richContent = {
        ...(richContent || {}),
        giphy: { id, type, width, height, aspectRatio: trimmedAspectRatio },
      };
    }

    const pinMessageEvent = new PinMessageEvent({
      id: messageId,
      message: {
        id: message.id,
        text: this.safeguardingService.clean(message.text),
        created: message.created,
        sender: {
          id: sender.id,
          firstName: sender.firstName,
          profilePhoto: sender.profilePhoto,
          accountRole: sender.accountRole,
        },
        deleted: message.deleted,
        likes: message.likes,
        likesCount: message.likesCount,
        richContent: richContent,
        resolved: message.resolved,
      },
    });

    this.conversationChannel.send(
      pinMessageEvent,
      conversationId.toHexString(),
    );
  }

  async getMessagesByConversation(messagesFilterInput: MessagesFilterInput) {
    return await this.messageLogic.getMessagesByConversation(
      messagesFilterInput,
    );
  }
}
