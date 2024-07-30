import { ObjectID } from 'mongodb';
import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'user_block_model' })
export class UserBlockModel {
  id: string;

  @Prop({
    required: true,
  })
  blockedUserId: ObjectID;

  @Prop({
    required: true,
  })
  blockingUserId: ObjectID;

  @Prop({
    type: String,
    required: true,
  })
  scope: string;

  @Prop({
    required: true,
  })
  scopeId: ObjectID;
}

export type UserBlockDTo = Omit<UserBlockModel, 'id'>;

export type UserBlockDocument = UserBlockModel & Document;
export const UserBlockSchema = SchemaFactory.createForClass(UserBlockModel);

export type UserBlockScope = {
  scope: typeof UserBlockModel.prototype.scope;
  scopeId: typeof UserBlockModel.prototype.scopeId;
};
