import { ObjectID } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import { str } from '../utils/converters.utils';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { ConversationCacheManagerService } from '../cache-manager/conversation-cache-manager.service';
import {
  ChatConversationDocument,
  ChatConversationModel,
  chatConversationToObject,
} from './models/conversation.model';
import {
  LastReadDocument,
  LastReadModel,
  lastReadDocumentToObject,
} from './models/lastRead.model';
import {
  CreateChatConversationDto,
  Tag,
} from './models/CreateChatConversation.dto';
import { AddMemberDTO } from './models/AddMember.dto';
import { LastRead } from './models/LastRead.entity';
import { LastReadInput } from './models/LastReadInput.dto';
import { Permission } from './models/Permission.dto';
import { ContextSchema, Product } from './models/ContextSchema.dto';
import { UnreadCountInput, UnreadCountOutput } from './models/unreadCount.dto';
import { LastMessageInput, LastMessageOutput } from './models/lastMessage.dto';
import { MessageData } from '../message/message.data';
import { ChatMessage } from '../message/models/message.entity';

export interface IConversationData {
  addMember(
    conversationId: string,
    addMember: AddMemberDTO,
  ): Promise<ChatConversationModel>;
  removeMember(
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationModel>;
  blockMember(conversationIds: string[], memberId: string): Promise<void>;
  unblockMember(conversationIds: string[], memberId: string): Promise<void>;
  create(data: CreateChatConversationDto): Promise<ChatConversationModel>;
  updateTags(
    conversationId: string,
    tags: Tag[],
  ): Promise<ChatConversationModel>;
  getConversation(conversationId: string): Promise<ChatConversationModel>;
  getConversationsForInbox(
    userId: string,
    contexts: ContextSchema[],
  ): Promise<ChatConversationModel[]>;
  listConversationIds(
    query: FilterQuery<ChatConversationDocument>,
  ): Promise<string[]>;
  migratePermissions(
    chatPermissionsDto: Permission[],
    product: Product,
    conversationIds: string[],
  ): Promise<void>;
  updateConversationWithLastMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel>;
  getLastRead(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<LastRead>;
  recordLastMessageReadByUser({
    conversationId,
    messageId,
    authenticatedUser,
  }: LastReadInput): Promise<LastRead>;
  getUnreadMessageCounts({
    userId,
    conversationIds,
  }: UnreadCountInput): Promise<UnreadCountOutput[]>;
  getUnreadCountInConversation(
    userId: string,
    conversationId: string,
  ): Promise<number>;
  getLastMessages({
    userId,
    conversationIds,
  }: LastMessageInput): Promise<LastMessageOutput[]>;
  pinMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel>;
  unpinMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel>;
}
@Injectable()
export class ConversationData implements IConversationData {
  constructor(
    @InjectModel(ChatConversationModel.name)
    private chatConversationModel: Model<ChatConversationDocument>,
    @InjectModel(LastReadModel.name)
    private lastReadModel: Model<LastReadDocument>,
    private conversationCacheManagerService: ConversationCacheManagerService,
    private messageData: MessageData,
  ) {}

  async addMember(
    conversationId: string,
    addMember: AddMemberDTO,
  ): Promise<ChatConversationModel> {
    const result = await this.chatConversationModel.findOneAndUpdate(
      { _id: conversationId },
      { $addToSet: { memberIds: addMember.userId } },
      { new: true },
    );
    if (!result) throw new Error('Could not add member to conversation');
    const conversation = chatConversationToObject(result);
    this.conversationCacheManagerService.set(conversation, conversationId);
    return conversation;
  }

  async removeMember(
    conversationId: string,
    memberId: string,
  ): Promise<ChatConversationModel> {
    const result = await this.chatConversationModel.findOneAndUpdate(
      { _id: conversationId },
      { $pull: { memberIds: memberId } },
      { new: true },
    );
    if (!result) throw new Error('Could not remove member from conversation');
    const conversation = chatConversationToObject(result);
    this.conversationCacheManagerService.set(conversation, conversationId);
    return conversation;
  }

  async blockMember(
    conversationIds: string[],
    memberId: string,
  ): Promise<void> {
    await this.chatConversationModel.updateMany(
      { _id: { $in: conversationIds } },
      { $addToSet: { blockedMemberIds: memberId } },
      { new: true },
    );
    for (const conversationId of conversationIds) {
      this.conversationCacheManagerService.del(conversationId);
    }
  }

  async unblockMember(
    conversationIds: string[],
    memberId: string,
  ): Promise<void> {
    await this.chatConversationModel.updateMany(
      { _id: { $in: conversationIds } },
      { $pull: { blockedMemberIds: memberId } },
      { new: true },
    );
    for (const conversationId of conversationIds) {
      this.conversationCacheManagerService.del(conversationId);
    }
  }

  async create(
    data: CreateChatConversationDto,
  ): Promise<ChatConversationModel> {
    const chatConversation = new this.chatConversationModel();
    chatConversation.context = data.context;
    chatConversation.product = data.product;
    chatConversation.permissions = data.permissions ?? [];
    chatConversation.tags = data.tags;
    if (data.memberIds) {
      chatConversation.memberIds = data.memberIds;
    }
    if (data.blockedMemberIds) {
      chatConversation.blockedMemberIds = data.blockedMemberIds;
    }
    const dbResult = await chatConversation.save();
    return chatConversationToObject(dbResult);
  }

  async createChatConversation(
    data: ChatConversationModel,
  ): Promise<ChatConversationModel> {
    const chatConversation = new this.chatConversationModel(data);
    const dbResult = await chatConversation.save();
    return chatConversationToObject(dbResult);
  }

  async updateTags(
    conversationId: string,
    tags: Tag[],
  ): Promise<ChatConversationModel> {
    const result = await this.chatConversationModel.findOneAndUpdate(
      { _id: conversationId },
      { $set: { tags } },
      { new: true },
    );
    if (!result) throw new Error('Could not update tags on conversation');
    const conversation = chatConversationToObject(result);

    this.conversationCacheManagerService.set(conversation, conversationId);
    return conversation;
  }

  async getConversation(
    conversationId: string,
  ): Promise<ChatConversationModel> {
    const cachedConversation = await this.conversationCacheManagerService.get(
      conversationId,
    );
    if (cachedConversation) {
      return cachedConversation;
    }

    const rawConversation = await this.chatConversationModel.findById(
      conversationId,
    );
    if (!rawConversation) {
      throw new Error('Could not find conversation');
    }
    const conversation = chatConversationToObject(rawConversation);

    this.conversationCacheManagerService.set(conversation, conversationId);
    return conversation;
  }

  async getConversationsForInbox(
    userId: string,
    contexts: ContextSchema[],
  ): Promise<ChatConversationModel[]> {
    // TODO: we want to order by last message sent
    return await this.chatConversationModel.find({
      memberIds: userId, // this is similar to an array contains
      context: { $in: contexts }, // this is similar to an array contains any in 2nd array, like an or
    });
  }

  async getConversationByAllMemberIdsAndContext(
    memberIds: string[],
    contexts: ContextSchema[],
  ): Promise<ChatConversationModel | null> {
    const dbResult = await this.chatConversationModel.findOne({
      memberIds: { $all: memberIds }, // this matches complete array without order
      context: { $in: contexts }, // this is similar to an array contains any in 2nd array, like an or
    });

    if (!dbResult) {
      return null;
    }

    return chatConversationToObject(dbResult);
  }

  async listConversationIds(
    query: FilterQuery<ChatConversationDocument>,
  ): Promise<string[]> {
    const conversations: ChatConversationDocument[] =
      await this.chatConversationModel.find(query, {
        _id: 1,
      });

    return conversations.map((conversation) => String(conversation._id));
  }

  async migratePermissions(
    chatPermissionsDto: Permission[],
    product: Product,
    conversationIds: string[],
  ): Promise<void> {
    const query = { product, _id: { $in: conversationIds } };
    await this.chatConversationModel.updateMany(
      query,
      { permissions: chatPermissionsDto },
      { upsert: false },
    );

    conversationIds.forEach((conversationId) =>
      this.conversationCacheManagerService.del(conversationId),
    );
  }

  async updateConversationWithLastMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel> {
    const chatConversation = await this.chatConversationModel.findById(
      conversationId,
    );
    if (!chatConversation) {
      throw new Error(`Conversation with id ${conversationId} does not exist`);
    }

    if (
      !chatConversation.lastMessageId ||
      chatConversation.lastMessageId < messageId
    ) {
      chatConversation.lastMessageId = messageId;
      const dbResult = await chatConversation.save();
      this.conversationCacheManagerService.del(conversationId);
      return chatConversationToObject(dbResult);
    }

    // No change, just return the chat conversation
    return chatConversationToObject(chatConversation);
  }

  async getLastRead(
    authenticatedUser: IAuthenticatedUser,
    conversationId: string,
  ): Promise<LastRead> {
    const dbResult = await this.lastReadModel.findOne({
      conversationId,
      userId: authenticatedUser.userId.toHexString(),
    });
    if (!dbResult) {
      throw new Error('Could not find last read chat message of conversation');
    }
    return lastReadDocumentToObject(dbResult);
  }

  async recordLastMessageReadByUser({
    conversationId,
    messageId,
    authenticatedUser,
  }: LastReadInput): Promise<LastRead> {
    const dbResult = await this.lastReadModel.findOneAndUpdate(
      { conversationId, userId: authenticatedUser.userId.toHexString() },
      { messageId },
      { new: true, upsert: true },
    );
    return lastReadDocumentToObject(dbResult);
  }

  /*
   * Returns the array of [{ "id": string, "unreadMessageCount": number}]
   * For now, unreadMessageCount will be either 0 or 1
   * 1 meaning there are unread messages, 0 meaning there aren't
   * In further releases, we can populate the exact number of
   * unread messages for a user in a conversation
   * */
  async getUnreadMessageCounts({
    userId,
    conversationIds,
  }: UnreadCountInput): Promise<UnreadCountOutput[]> {
    const [lastReads, conversations] = await Promise.all([
      this.lastReadModel.find({
        userId,
        conversationId: { $in: conversationIds },
      }),
      this.chatConversationModel
        .find(
          {
            _id: { $in: conversationIds },
            memberIds: userId,
          },
          { id: 1, lastMessageId: 1 },
        )
        .sort({ _id: 1 }),
    ]);
    const result = [];
    for (const conv of conversations) {
      const row = { id: conv.id, unreadMessageCount: 0 };
      if (!conv || !conv.lastMessageId) {
        result.push(row);
        continue;
      }
      const lastReadsMatched = lastReads.filter(
        (lr) => lr.conversationId === conv.id,
      );
      if (lastReadsMatched.length > 0) {
        // TODO: Enhance the logic of unread message count to exact number
        const lastRead = lastReadsMatched[0];
        const numberOfUnreadMessages =
          str(lastRead.messageId) === str(conv.lastMessageId) ? 0 : 1;
        row['unreadMessageCount'] = numberOfUnreadMessages;
      }
      result.push(row);
    }

    return result;
  }

  async getUnreadCountInConversation(
    userId: string,
    conversationId: string,
  ): Promise<number> {
    const lastRead = await this.lastReadModel.findOne({
      userId,
      conversationId,
    });
    const conversation = await this.chatConversationModel.findById(
      conversationId,
    );
    if (!conversation || !conversation.lastMessageId) {
      // There is no such conversation or it doesnt contain any messages
      return 0;
    }
    if (!lastRead) {
      // There are no records found where user has read this conversation
      return 1;
    }
    return str(conversation.lastMessageId) === str(lastRead.messageId) ? 0 : 1;
  }

  /* Returns the array of [{ "id": string, "lastMessage": ChatMessage}]
   * where the id is conversationId and lastMessage is last message in
   * that conversation
   * */
  async getLastMessages({
    userId,
    conversationIds,
  }: LastMessageInput): Promise<LastMessageOutput[]> {
    const conversations = await this.chatConversationModel.find(
      {
        _id: { $in: conversationIds },
        memberIds: userId,
      },
      { id: 1, lastMessageId: 1 },
    );

    const lastMessageIds = conversations
      .map((conversation) => conversation.lastMessageId)
      .filter((lastMessageId): lastMessageId is ObjectID => !!lastMessageId);
    const lastMessages = await this.messageData.getMessages(lastMessageIds);

    const lastMessageMap = new Map<string, ChatMessage>();
    for (const lastMessage of lastMessages) {
      lastMessageMap.set(String(lastMessage.id), lastMessage);
    }

    const lastMessageOutput: LastMessageOutput[] = conversations.map(
      (conversation) => {
        const { lastMessageId } = conversation;
        const lastMessage = lastMessageId
          ? lastMessageMap.get(String(lastMessageId))
          : undefined;

        return {
          id: conversation.id as string,
          lastMessage,
        };
      },
    );

    return lastMessageOutput;
  }

  async pinMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel> {
    const result = await this.chatConversationModel.findOneAndUpdate(
      { _id: conversationId },
      {
        $addToSet: {
          pinnedMessages: messageId,
        },
      },
      { new: true },
    );
    if (!result) throw new Error('Could not pin message');

    const conversation = chatConversationToObject(result);
    this.conversationCacheManagerService.set(conversation, conversationId);
    return conversation;
  }

  async unpinMessage(
    conversationId: string,
    messageId: ObjectID,
  ): Promise<ChatConversationModel> {
    const result = await this.chatConversationModel.findOneAndUpdate(
      { _id: conversationId },
      {
        $pull: {
          pinnedMessages: messageId,
        },
      },
      { new: true },
    );
    if (!result) throw new Error('Could not unpin message');

    const conversation = chatConversationToObject(result);
    this.conversationCacheManagerService.set(conversation, conversationId);
    return conversation;
  }
}
