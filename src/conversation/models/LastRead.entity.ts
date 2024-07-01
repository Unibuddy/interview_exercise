import { ObjectID } from 'mongodb';
import { ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

@ObjectType()
export class LastRead {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  messageId: ObjectID;
}
