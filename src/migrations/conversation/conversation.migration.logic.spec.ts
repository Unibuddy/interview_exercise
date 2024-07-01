import { Test, TestingModule } from '@nestjs/testing';
import { ConversationMigrationData } from './conversation.migration.data';
import { ConversationMigrationLogic } from './conversation.migration.logic';

describe('ConversationMigrationLogic', () => {
  let service: ConversationMigrationLogic;
  let conversationMigrationData: ConversationMigrationData;

  class MockedConversationMigrationData {
    async migrateLastMessagesForEveryConversation() {
      return;
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationMigrationLogic,
        {
          provide: ConversationMigrationData,
          useClass: MockedConversationMigrationData,
        },
      ],
    }).compile();

    service = module.get<ConversationMigrationLogic>(
      ConversationMigrationLogic,
    );

    conversationMigrationData = module.get<ConversationMigrationData>(
      ConversationMigrationData,
    );
  });

  describe('Migrate Last Messages', () => {
    it('is defined', () => {
      expect(service.migrateLastMessagesForEveryConversation).toBeDefined();
    });

    it('calls data layer', async () => {
      const dataSpy = jest
        .spyOn(
          conversationMigrationData,
          'migrateLastMessagesForEveryConversation',
        )
        .mockImplementationOnce(() => {
          return Promise.resolve(true);
        });
      await service.migrateLastMessagesForEveryConversation();
      expect(dataSpy).toBeCalledWith();
    });
  });
});
