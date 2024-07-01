import { Field, InputType } from '@nestjs/graphql';
import { ObjectID } from 'mongodb';

@InputType()
export class pinMessageDTO {
  @Field()
  messageId: ObjectID;

  @Field()
  conversationId: string;
}

@InputType()
export class unpinMessageDTO {
  @Field()
  messageId: ObjectID;

  @Field()
  conversationId: string;
}
