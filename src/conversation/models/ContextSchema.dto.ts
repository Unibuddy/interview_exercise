import { ObjectId } from 'mongodb';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Prop } from '@nestjs/mongoose';

export enum Product {
  virtualEvent = 'virtualEvent',
  community = 'community',
}

export enum ContextType {
  university = 'university',
  isDirectConversation = 'isDirectConversation',
  isNewsFeedConversation = 'isNewsFeedConversation',
}

registerEnumType(ContextType, {
  name: 'ContextType',
});

export type ContextIdType = string | Product | boolean | ObjectId;

@ObjectType()
export class Context {
  @Field()
  @ApiProperty({ type: String })
  id: string;

  @Field(() => ContextType)
  @ApiProperty({ enum: ContextType })
  type: ContextType;
}

// This is for DB schema and shouldn't be used for data input or as response on graph/API
export class ContextSchema {
  constructor(id: ContextIdType, type: ContextType) {
    this.id = id;
    this.type = type;
  }

  @Prop({ required: true, type: String })
  id: ContextIdType;

  @Prop({
    type: String,
    required: true,
    enum: ContextType,
  })
  type: ContextType;
}
