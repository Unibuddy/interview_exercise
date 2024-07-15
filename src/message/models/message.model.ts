import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectID } from 'mongodb';
import { AttachmentType, GifType } from './message.dto';
import { Field, ObjectType } from '@nestjs/graphql';
//import tags
import {Tag} from '../../conversation/models/CreateChatConversation.dto';
import { ApiProperty } from '@nestjs/swagger';


@Schema()
export class ReplyMessage {
  @Prop()
  id: ObjectID;
}
@Schema()
export class Giphy {
  @Prop()
  id: string;

  @Prop({
    type: GifType,
  })
  type: GifType;

  @Prop()
  height: number;

  @Prop()
  width: number;

  @Prop()
  aspectRatio: number;
}

@Schema()
export class Image {
  @Prop()
  url: string;
}

@Schema()
export class Attachment {
  @Prop()
  link: string;

  @Prop({ type: AttachmentType })
  type: AttachmentType;

  @Prop({ type: String, nullable: true })
  size?: string;

  @Prop({ type: String, nullable: true })
  fileName?: string;
}

@Schema()
export class PollOption {
  @Prop()
  option: string;

  @Prop({ type: [ObjectID], default: [] })
  votes?: Set<ObjectID>;
}

@Schema()
export class Poll {
  @Prop()
  question: string;

  @Prop({ type: [PollOption] })
  options: Array<PollOption>;

  @Prop({ type: Boolean })
  allowMultipleAnswers: boolean;
}

@Schema()
export class RichMessageContent {
  @Prop({
    type: ReplyMessage,
  })
  reply?: ReplyMessage;

  @Prop({
    type: Giphy,
  })
  giphy?: Giphy;

  @Prop({
    type: [Image],
  })
  images?: Image[];

  @Prop({
    type: [Attachment],
  })
  attachments?: Attachment[];

  @Prop({
    type: Poll,
  })
  poll?: Poll;
}

@Schema()
@ObjectType()
export class Reaction {
  @Prop({ type: String, unique: true })
  @Field(() => String, { nullable: false })
  reaction: string;

  @Prop({ type: String, unique: true })
  @Field(() => String, { nullable: false })
  reactionUnicode: string;

  @Prop({ type: [String], default: [] })
  @Field(() => [String], { nullable: false })
  userIds: string[];
}

@Schema()
export class ChatMessageModel {
  id: ObjectID;

  @Prop()
  text: string;

  @Prop({ required: true, type: () => Date })
  created: Date;

  @Prop({ required: true })
  senderId: ObjectID;

  @Prop({ required: true, index: true })
  conversationId: ObjectID;

  @Prop({
    required: true,
    default: false,
  })
  deleted: boolean;

  @Prop({
    default: false,
  })
  resolved: boolean;

  @Prop()
  likes: Array<ObjectID>;

  @Prop({ type: RichMessageContent })
  richContent?: RichMessageContent;

  @Prop({
    type: [{ reaction: String, userIds: [String], reactionUnicode: String }],
    nullable: true,
  })
  reactions?: Reaction[];

  /**
   * All the properties below are virtual properties
   * @url https://mongoosejs.com/docs/tutorials/virtuals.html
   **/
  conversation: { id: string };
  likesCount: number;
  sender: { id: string };

  //adding a tag to each message
  @ApiProperty({ type: [Tag], required: false })
  tags?: Tag[];
}

export type ChatMessageDocument = ChatMessageModel & Document;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessageModel);

ChatMessageSchema.virtual('conversation').get(function (
  this: ChatMessageDocument,
) {
  return { id: String(this.conversationId) };
});

ChatMessageSchema.virtual('likesCount').get(function (
  this: ChatMessageDocument,
) {
  return this.likes.length;
});

ChatMessageSchema.virtual('sender').get(function (this: ChatMessageDocument) {
  return { id: String(this.senderId) };
});

ChatMessageSchema.index({ conversationId: 1, created: -1, _id: -1 });

export function chatMessageToObject(
  doc: ChatMessageDocument,
): ChatMessageModel {
  const parsed: ChatMessageModel = doc.toObject<ChatMessageModel>({
    getters: true,
    virtuals: true,
    versionKey: false,
  });

  function maskDeletedMessageText(deleted: boolean, text: string) {
    if (deleted) return 'This message has been deleted';
    return text;
  }

  return {
    ...parsed,
    id: new ObjectID(parsed.id),
    text: maskDeletedMessageText(parsed.deleted, parsed.text),
  };
}
