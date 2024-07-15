import { ObjectType, ID, Field, Float, Directive } from '@nestjs/graphql';
import { ObjectID } from 'mongodb';
import { UserField, MessageSender } from '../../user/models/user.model';
import { ChatConversation } from '../../conversation/models/ChatConversation.entity';
import { AttachmentType, GifType } from './message.dto';
import { Reaction } from './message.model';

class ReplyMessageSocket {
  text?: string;

  created?: Date;

  sender?: MessageSender;

  richContent?: RichMessageContent;

  deleted?: boolean;
}

@ObjectType()
export class ReplyMessage extends ReplyMessageSocket {
  @Field(() => ObjectID)
  id: ObjectID;
}

@ObjectType()
export class Giphy {
  @Field()
  id: string;

  @Field(() => GifType)
  type: GifType;

  @Field()
  width: number;

  @Field()
  height: number;

  @Field(() => Float)
  aspectRatio: number;
}

@ObjectType()
export class Image {
  @Field()
  url: string;
}

@ObjectType()
export class Attachment {
  @Field()
  link: string;

  @Field(() => AttachmentType)
  type: AttachmentType;

  @Field()
  size?: string;

  @Field()
  fileName?: string;
}

@ObjectType()
export class PollOption {
  @Field()
  option: string;

  @Field(() => [ObjectID], { defaultValue: [] })
  votes?: Set<ObjectID>;
}

@ObjectType()
export class Poll {
  @Field()
  question: string;

  @Field(() => [PollOption])
  options: PollOption[];

  @Field(() => Boolean)
  allowMultipleAnswers: boolean;
}

@ObjectType()
export class RichMessageContent {
  @Field(() => ReplyMessage, { nullable: true })
  reply?: ReplyMessage;

  @Field(() => Giphy, { nullable: true })
  giphy?: Giphy;

  @Field(() => [Image], { nullable: true })
  images?: Image[];

  @Field(() => [Attachment], { nullable: true })
  attachments?: Attachment[];

  @Field(() => Poll, { nullable: true })
  poll?: Poll;
}

@ObjectType()
export class ChatMessageData {
  @Field()
  text: string;

  @Field(() => ChatConversation)
  conversation: ChatConversation;

  @Field()
  sender: UserField;
}

@ObjectType()
@Directive('@key(fields: "id")')
export class ChatMessage {
  @Field(() => ID)
  id: ObjectID;

  @Field()
  text: string;

  @Field()
  created: Date;

  @Field()
  sender: UserField;

  @Field({ defaultValue: false })
  deleted: boolean;

  @Field({ defaultValue: false })
  resolved: boolean;

  @Field(() => [ObjectID])
  likes: Array<ObjectID>;

  @Field(() => Number)
  likesCount: number;

  @Field(() => RichMessageContent, { nullable: true })
  richContent?: RichMessageContent;

  @Field(() => [Reaction], { nullable: true })
  reactions?: Reaction[];

  @Field({ defaultValue: false, nullable: true })
  isSenderBlocked?: boolean;

  /*@Field({ defaultValue: []})
  tags?: string[];*/
}

/***
 * compare ChatMessage and SocketChatMessage when adding new field
 */

export class SocketChatMessage {
  id: ObjectID;

  text: string;

  created: Date;

  sender: MessageSender;

  deleted: boolean;

  resolved: boolean;

  likesCount: number;

  likes: ObjectID[];

  richContent?: RichMessageContent;

  reactions?: Reaction[];

  isSenderBlocked?: boolean;

  tags?: string[];
}

@ObjectType()
export class PaginatedChatMessages {
  @Field(() => [ChatMessage])
  messages: ChatMessage[];

  @Field()
  hasMore: boolean;
}
