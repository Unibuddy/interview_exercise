import { ObjectID } from 'mongodb';
import { ChatConversationModel } from './models/conversation.model';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ConversationController } from './conversation.controller';
import { ConversationLogic } from './conversation.logic';
import { ConversationMigrationLogic } from '../migrations/conversation/conversation.migration.logic';
import { ConversationData } from './conversation.data';
import { PermissionsService } from '../permissions/permissions.service';
import { Action, Subject } from '../permissions/models/permissions.model';
import { Product } from './models/ContextSchema.dto';
import { Tag, TagType } from './models/CreateChatConversation.dto';
import { DirectChatConversationDto } from './dto/DirectChatConversationDto';

describe('ConversationController', () => {
  let conversationController: ConversationController;
  let conversationMigrationLogic: ConversationMigrationLogic;
  let conversationLogic: ConversationLogic;
  const testConversationIds = ['conversation001', 'conversation002'];
  const testMemberId = 'member001';

  class MockedConversationLogic {
    blockMember() {
      return;
    }
    unblockMember() {
      return;
    }
    migratePermissions() {
      return;
    }
    getUnreadMessageCounts() {
      return;
    }
    updateTags() {
      return;
    }
    createDirectChatConversation() {
      return;
    }
  }

  class MockedConversationMigrationLogic {
    migrateLastMessagesForEveryConversation() {
      return;
    }
  }

  class MockedConversationData {
    blockMember() {
      return;
    }
    unblockMember() {
      return;
    }
  }

  class MockedConfigService {
    get() {
      return {
        allowMigrations: true,
      };
    }
  }

  class mockedPermissionsService {}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        ConversationLogic,
        ConfigService,
        { provide: ConfigService, useClass: MockedConfigService },
        { provide: ConversationData, useClass: MockedConversationData },
        { provide: ConversationLogic, useClass: MockedConversationLogic },
        { provide: PermissionsService, useClass: mockedPermissionsService },
        {
          provide: ConversationMigrationLogic,
          useClass: MockedConversationMigrationLogic,
        },
      ],
    }).compile();

    conversationController = module.get<ConversationController>(
      ConversationController,
    );
    conversationLogic = module.get<ConversationLogic>(ConversationLogic);
    conversationMigrationLogic = module.get<ConversationMigrationLogic>(
      ConversationMigrationLogic,
    );
  });

  it('should be defined', () => {
    expect(conversationController).toBeDefined();
  });

  it('should be include block member method', () => {
    expect(conversationController.blockMember).toBeDefined();
  });

  it('should be include unblock member method', () => {
    expect(conversationController.unblockMember).toBeDefined();
  });

  it('should call block in logic layer', async () => {
    const conversationBlockingLogicSpy = jest
      .spyOn(conversationLogic, 'blockMember')
      .mockImplementationOnce(() => {
        return Promise.resolve();
      });
    try {
      await conversationController.blockMember({
        conversationIds: testConversationIds,
        memberId: testMemberId,
      });
      expect(conversationBlockingLogicSpy).toHaveBeenCalledWith(
        testConversationIds,
        testMemberId,
      );
    } catch (e) {
      console.log(e);
    }
  });

  it('should call unblock in logic layer', async () => {
    const conversationUnblockingLogicSpy = jest
      .spyOn(conversationLogic, 'unblockMember')
      .mockImplementationOnce(() => {
        return Promise.resolve();
      });
    try {
      await conversationController.unblockMember({
        conversationIds: testConversationIds,
        memberId: testMemberId,
      });
      expect(conversationUnblockingLogicSpy).toHaveBeenCalledWith(
        testConversationIds,
        testMemberId,
      );
    } catch (e) {
      console.log(e);
    }
  });

  it('should include migratePermissions method', () => {
    expect(conversationController.migratePermissions).toBeDefined();
  });

  it('should call migratePermissions in logic layer', async () => {
    const newPermissions = [
      {
        action: Action.readConversation,
        subject: Subject.user,
        conditions: { userId: { $in: 'conversation.universityids' } },
      },
    ];
    const fakeConversationIds = ['someId'];
    const conversationMigrationSpy = jest
      .spyOn(conversationLogic, 'migratePermissions')
      .mockImplementationOnce(() => {
        return Promise.resolve();
      });
    await conversationController.migratePermissions({
      permissions: newPermissions,
      product: Product.community,
      conversationIds: fakeConversationIds,
    });
    expect(conversationMigrationSpy).toHaveBeenCalledWith(
      newPermissions,
      Product.community,
      fakeConversationIds,
    );
  });

  it('should include migrateLastMessages method', () => {
    expect(conversationController.migrateLastMessages).toBeDefined();
  });

  it('should call migrateLastMessages in logic layer', async () => {
    const conversationMigrationSpy = jest
      .spyOn(
        conversationMigrationLogic,
        'migrateLastMessagesForEveryConversation',
      )
      .mockImplementationOnce(() => {
        return Promise.resolve(true);
      });
    await conversationController.migrateLastMessages();
    expect(conversationMigrationSpy).toHaveBeenCalledWith();
  });

  it('should include  method', () => {
    expect(conversationController.getUnreadMessageCounts).toBeDefined();
  });

  it('should call getUnreadMessageCounts in logic layer', async () => {
    const conversationUnreadCountSpy = jest
      .spyOn(conversationLogic, 'getUnreadMessageCounts')
      .mockImplementationOnce(() => {
        return Promise.resolve([]);
      });
    const obj = {
      userId: testMemberId,
      conversationIds: testConversationIds,
    };
    await conversationController.getUnreadMessageCounts(
      testMemberId,
      testConversationIds,
    );
    expect(conversationUnreadCountSpy).toHaveBeenCalledWith(obj);
  });

  it('should update conversation tags', async () => {
    const conversationUpdateTagSpy = jest
      .spyOn(conversationLogic, 'updateTags')
      .mockImplementationOnce(() => {
        return Promise.resolve(new ChatConversationModel());
      });
    const tag1 = new Tag();
    tag1.id = 'tag1';
    tag1.type = TagType.subTopic;
    const tag2 = new Tag();
    tag2.id = 'tag2';
    tag2.type = TagType.subTopic;
    const tags = [tag1, tag2];
    await conversationController.updateTags(testConversationIds[0], tags);
    expect(conversationUpdateTagSpy).toHaveBeenCalledTimes(1);
    expect(conversationUpdateTagSpy).toHaveBeenCalledWith(
      testConversationIds[0],
      tags,
    );
  });

  it('should create direct conversation', async () => {
    const dummyChatId = new ObjectID().toHexString();
    const directConversationLogicSpy = jest
      .spyOn(conversationLogic, 'createDirectChatConversation')
      .mockImplementationOnce(() => {
        const chat = new ChatConversationModel();
        chat.id = dummyChatId;
        return Promise.resolve(chat);
      });
    const chatRes = await conversationController.createDirectConversation(
      {} as DirectChatConversationDto,
    );
    expect(directConversationLogicSpy).toHaveBeenCalledTimes(1);
    expect(chatRes).toEqual({
      id: dummyChatId,
    });
  });
});
