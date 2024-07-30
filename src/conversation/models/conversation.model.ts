import { Tag } from './CreateChatConversation.dto';
import { ObjectID } from 'mongodb';
import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Permission } from './Permission.dto';
import { Product, ContextSchema } from './ContextSchema.dto';

@Schema({ collection: 'chatconverationmodels' }) // keeping the collection's old name in the DB
export class ChatConversationModel {
  /**
   * No props here it's added to all documents but we need this
   * to be able to match the return type
   */
  id: string;

  @Prop({
    required: true,
    // Getter and setter to work around https://jira.mongodb.org/browse/NODE-1645, without resorting to unsafe { checkKeys: false}
    set: (permissions: Permission[]): string => JSON.stringify(permissions),
    get: (permissions: string): Permission[] => JSON.parse(permissions),
  })
  permissions: Permission[];

  @Prop({
    type: String,
    required: true,
    enum: Product,
  })
  product: Product;

  @Prop([ContextSchema])
  context: ContextSchema[];

  @Prop({ type: [String] })
  memberIds: string[];

  @Prop({ type: [String] })
  blockedMemberIds: string[];

  @Prop({ required: false })
  lastMessageId: ObjectID;

  @Prop({ type: [ObjectID], required: false })
  pinnedMessages?: ObjectID[];

  @Prop({
    type: [{ id: { type: String }, type: { type: String } }],
    required: false,
    default: [],
  })
  tags?: Tag[];
}

export type ChatConversationDocument = ChatConversationModel & Document;

export function chatConversationToObject(
  doc?: ChatConversationDocument,
): ChatConversationModel {
  if (!doc) {
    throw new Error('No Conversation document found');
  }
  const parsed = doc.toObject({
    getters: true,
    virtuals: true,
    versionKey: false,
  });
  return parsed;
}

export const ChatConversationSchema = SchemaFactory.createForClass(
  ChatConversationModel,
);

ChatConversationSchema.index({ memberIds: 1 });
ChatConversationSchema.index({ context: 1 });
