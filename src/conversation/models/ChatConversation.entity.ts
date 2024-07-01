import { ObjectType, ID, Field, Directive } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

import { ChatMessage } from '../../message/models/message.entity';

@ObjectType()
@Directive('@key(fields: "id")')
export class ChatConversation {
  @Field(() => ID)
  @ApiProperty()
  id: string;

  @Field()
  unreadMessageCount?: number;

  @Field(() => ChatMessage)
  lastMessage?: ChatMessage;
}
