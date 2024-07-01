import { Module } from '@nestjs/common';
import { ConversationInboxResolver } from './conversation-inbox.resolver';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [ConversationModule],
  providers: [ConversationInboxResolver],
})
export class ConversationInboxModule {}
