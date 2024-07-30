import { MongooseModule } from '@nestjs/mongoose';
import { ObjectID } from 'mongodb';
import { Test, TestingModule } from '@nestjs/testing';

import { ConversationCacheManagerService } from '../../cache-manager/conversation-cache-manager.service';

import { ConversationData } from '../../conversation/conversation.data';
import {
  ChatConversationModel,
  ChatConversationSchema,
} from '../../conversation/models/conversation.model';
import { ChatConversation } from '../../conversation/models/ChatConversation.entity';
import {
  LastReadModel,
  LastReadSchema,
} from '../../conversation/models/lastRead.model';
import { MessageData } from '../../message/message.data';
import {
  ChatMessageModel,
  ChatMessageSchema,
} from '../../message/models/message.model';
import { createMessageDataForTest } from '../../message/utils/message.test-utils';

import { CreateChatConversationDto } from '../../conversation/models/CreateChatConversation.dto';
import { Permission } from '../../conversation/models/Permission.dto';

import {
  ContextType,
  Product,
} from '../../conversation/models/ContextSchema.dto';
import { Action, Subject } from '../../permissions/models/permissions.model';
import { ConversationMigrationData } from './conversation.migration.data';
import { ConfigManagerModule } from '../../configuration/configuration-manager.module';
import { ConfigurationManager } from '../../configuration/configuration-manager';

const senderId = new ObjectID('5fe0cce861c8ea54018385af');

class CacheMock {
  get() {
    return;
  }
  set() {
    return;
  }
  del() {
    return;
  }
}

const createConversation = async (
  conversationData: ConversationData,
  testId: string,
  product: Product = Product.community,
  permissions: Permission[] = [
    {
      action: Action.readConversation,
      subject: Subject.user,
      conditions: { userId: { $in: 'conversation.universityids' } },
    },
  ],
): Promise<ChatConversation> => {
  const testConversation: CreateChatConversationDto = {
    product,
    permissions,
    context: [
      {
        type: ContextType.university,
        id: testId,
      },
    ],
  };

  return await conversationData.create(testConversation);
};

describe('ConversationMigrationData', () => {
  let conversationData: ConversationData;
  let conversationMigrationData: ConversationMigrationData;
  let messageData: MessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          inject: [ConfigurationManager],
          useFactory: (configurationManager: ConfigurationManager) => {
            const databaseConfig =
              configurationManager.getConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatConversationModel.name, schema: ChatConversationSchema },
          { name: LastReadModel.name, schema: LastReadSchema },
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [
        ConversationData,
        ConversationMigrationData,
        MessageData,
        {
          provide: ConversationCacheManagerService,
          useClass: CacheMock,
        },
      ],
    }).compile();

    conversationData = module.get<ConversationData>(ConversationData);
    conversationMigrationData = module.get<ConversationMigrationData>(
      ConversationMigrationData,
    );
    messageData = module.get<MessageData>(MessageData);
  });

  describe('Migrate Last Messages', () => {
    let conversation1: ChatConversation;
    let conversation2: ChatConversation;
    let conversation3: ChatConversation;
    let conversation1Messages: ObjectID[] = [];
    let conversation1LastMessageId: ObjectID;
    let conversation2Messages: ObjectID[] = [];
    let conversation2LastMessageId: ObjectID;
    let conversation3Messages: ObjectID[] = [];
    let conversation3LastMessageId: ObjectID;
    const userId1 = new ObjectID().toHexString();

    beforeAll(async () => {
      const universityId = new ObjectID().toHexString();
      conversation1 = await createConversation(conversationData, universityId);
      conversation2 = await createConversation(conversationData, universityId);
      conversation3 = await createConversation(conversationData, universityId);
      await conversationData.addMember(conversation1.id, { userId: userId1 });
      await conversationData.addMember(conversation2.id, { userId: userId1 });
      await conversationData.addMember(conversation3.id, { userId: userId1 });

      conversation1Messages = await createMessageDataForTest(
        new ObjectID(conversation1.id),
        conversation1Messages,
        5,
        messageData,
        senderId,
      );
      conversation1LastMessageId = conversation1Messages.slice(-1)[0];

      conversation2Messages = await createMessageDataForTest(
        new ObjectID(conversation2.id),
        conversation2Messages,
        5,
        messageData,
        senderId,
      );
      conversation2LastMessageId = conversation2Messages.slice(-1)[0];

      conversation3Messages = await createMessageDataForTest(
        new ObjectID(conversation3.id),
        conversation3Messages,
        5,
        messageData,
        senderId,
      );
      conversation3LastMessageId = conversation3Messages.slice(-1)[0];
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    it('updates all conversations last message', async () => {
      await conversationMigrationData.migrateLastMessagesForEveryConversation();

      const firstConversation = await conversationData.getConversation(
        conversation1.id,
      );
      const secondConversation = await conversationData.getConversation(
        conversation2.id,
      );
      const thirdConversation = await conversationData.getConversation(
        conversation3.id,
      );

      expect(firstConversation.lastMessageId).toEqual(
        conversation1LastMessageId,
      );
      expect(secondConversation.lastMessageId).toEqual(
        conversation2LastMessageId,
      );

      expect(thirdConversation.lastMessageId).toEqual(
        conversation3LastMessageId,
      );
    });

    it('test for idempotence -- wont update last message if it already exists', async () => {
      const existingLastMessageId = new ObjectID('999f191e810c19729de860ea');
      await conversationData.updateConversationWithLastMessage(
        conversation1.id,
        existingLastMessageId,
      );

      const newFirstConversation = await conversationData.getConversation(
        conversation1.id,
      );
      expect(newFirstConversation.lastMessageId).toEqual(existingLastMessageId);

      await conversationMigrationData.migrateLastMessagesForEveryConversation();

      expect(newFirstConversation.lastMessageId).toEqual(existingLastMessageId);
    });

    it('does not fail on conversations with no messages', async () => {
      const universityId = new ObjectID().toHexString();
      const userId1 = new ObjectID().toHexString();

      const conversation4 = await createConversation(
        conversationData,
        universityId,
      );
      await conversationData.addMember(conversation4.id, { userId: userId1 });

      await conversationMigrationData.migrateLastMessagesForEveryConversation();

      const fourthConversation = await conversationData.getConversation(
        conversation4.id,
      );
      expect(fourthConversation.lastMessageId).toBeUndefined();
    });
  });
});
