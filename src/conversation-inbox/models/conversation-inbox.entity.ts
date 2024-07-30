import { Directive, Field, ObjectType } from '@nestjs/graphql';
import { ChatConversation } from '../../conversation/models/ChatConversation.entity';
import { Context } from '../../conversation/models/ContextSchema.dto';

@ObjectType()
@Directive('@key(fields: "contexts { id }")')
export class ConversationInbox {
  @Field(() => [Context], {
    description:
      'The contexts the conversations on this entity belong to. We should not try to resolve this from the FE as this should be set explicitly on the specific inbox resolvers.',
  })
  contexts: Context[];

  @Field(() => [ChatConversation])
  conversations: ChatConversation[];
}
