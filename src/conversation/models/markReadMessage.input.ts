import { ObjectID } from 'mongodb';
import { ID, Field, InputType } from '@nestjs/graphql';

@InputType()
export class MarkReadMessageDTO {
  @Field(() => ID)
  conversationId: string;
  messageId: ObjectID;
}
