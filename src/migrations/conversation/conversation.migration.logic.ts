import { Injectable } from '@nestjs/common';
import { ConversationMigrationData } from './conversation.migration.data';

@Injectable()
export class ConversationMigrationLogic {
  constructor(private conversationMigrationData: ConversationMigrationData) {}

  async migrateLastMessagesForEveryConversation(): Promise<boolean> {
    return this.conversationMigrationData.migrateLastMessagesForEveryConversation();
  }
}
