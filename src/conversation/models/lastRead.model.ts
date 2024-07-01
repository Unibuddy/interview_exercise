import { ObjectID } from 'mongodb';
import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/* Captures the last message that a user read
 * in a conversation */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class LastReadModel {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  messageId: ObjectID;
}
export const LastReadSchema = SchemaFactory.createForClass(LastReadModel);
LastReadSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

export type LastReadDocument = LastReadModel & Document;
export function lastReadDocumentToObject(doc: LastReadDocument): LastReadModel {
  const parsedLastReadObject = doc.toObject({
    getters: true,
    virtuals: true,
    versionKey: false,
  });
  return parsedLastReadObject;
}
