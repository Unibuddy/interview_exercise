import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ChatConversationDocument,
  ChatConversationModel,
} from '../../conversation/models/conversation.model';

import { MessageData } from '../../message/message.data';
import { ConversationData } from '../../conversation/conversation.data';

@Injectable()
export class ConversationMigrationData {
  constructor(
    @InjectModel(ChatConversationModel.name)
    private chatConversationModel: Model<ChatConversationDocument>,

    private messageData: MessageData,
    private conversationData: ConversationData,
  ) {}

  async migrateLastMessagesForEveryConversation(): Promise<boolean> {
    try {
      const conversations = await this.chatConversationModel.find(
        {},
        { _id: 1, lastMessageId: 1 },
      );

      console.log(`Found ${conversations.length} conversations`);

      for (const conversation of conversations) {
        if (!conversation.lastMessageId) {
          // get most recent message for each conversation
          // assumes the conversations are sorted in getChatConversationMessages

          const latestMessage =
            await this.messageData.getChatConversationMessages({
              conversationId: conversation._id,
              limit: 1,
            });

          if (latestMessage.messages?.length) {
            const messageId = latestMessage.messages[0].id;

            console.log(
              `setting last message of ${conversation.id} to ${messageId}`,
            );

            try {
              await this.conversationData.updateConversationWithLastMessage(
                conversation._id.toHexString(),
                messageId,
              );
            } catch (e) {
              if (e instanceof SyntaxError) {
                console.log('Skipping parsing error due to bad data');
              } else {
                throw e;
              }
            }
          } else {
            console.log(
              `There are no messages in the conversation: ${conversation.id}`,
            );
          }
        }
      }
      return true;
    } catch (error) {
      console.log('Error setting last messages, ', error);
      return false;
    }
  }
}
