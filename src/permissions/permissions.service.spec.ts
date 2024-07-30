import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { PermissionsService } from './permissions.service';
import { ObjectId } from 'mongodb';
import { AbilityFactory } from './ability-factory';
import { Action, Subject, AccountRole } from './models/permissions.model';
import { UserBlocksLogic } from '../user-blocks/user-blocks.logic';
import { ConversationLogic } from '../conversation/conversation.logic';
import { ConversationData } from '../conversation/conversation.data';
import { MessageData } from '../message/message.data';

class MockConversationLogic {
  isDirectConversation() {
    return false;
  }
}

const permissions = [
  {
    action: Action.manage,
    subject: Subject.all,
    conditions: {
      accountRole: AccountRole.admin,
    },
  },
  {
    action: Action.readConversation,
    subject: Subject.user,
    conditions: {
      userId: {
        $in: 'conversation.memberIds',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: Action.sendMessage,
    subject: Subject.user,
    conditions: {
      userId: {
        $in: 'conversation.memberIds',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: Action.updateMessage,
    subject: Subject.user,
    conditions: { userId: { $eq: 'message.senderId' } },
  },
  {
    action: Action.deleteMessage,
    subject: Subject.user,
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
      accountRole: AccountRole.university,
    },
  },
  {
    action: Action.deleteMessage,
    subject: Subject.user,
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
      accountRole: AccountRole.mentor,
    },
  },
  {
    action: Action.deleteMessage,
    subject: Subject.user,
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
      accountRole: AccountRole.staff,
    },
  },
  {
    action: Action.deleteMessage,
    subject: Subject.user,
    conditions: {
      userId: { $eq: 'message.senderId' },
      accountRole: AccountRole.applicant,
    },
  },
  {
    action: Action.createPoll,
    subject: Subject.user,
    conditions: {
      userId: { $eq: 'message.senderId' },
      accountRole: {
        $in: [AccountRole.university, AccountRole.staff, AccountRole.mentor],
      },
    },
  },
];

describe('PermissionsService', () => {
  let permissionsService: PermissionsService;
  let conversationData: any;
  let messageData: DeepMocked<MessageData>;
  let userBlocksLogic: DeepMocked<UserBlocksLogic>;

  beforeAll(async () => {
    messageData = createMock<MessageData>();
    conversationData = createMock<ConversationData>();
    userBlocksLogic = createMock<UserBlocksLogic>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbilityFactory,
        PermissionsService,
        { provide: ConversationData, useValue: conversationData },
        { provide: MessageData, useValue: messageData },
        { provide: ConversationLogic, useClass: MockConversationLogic },
        { provide: UserBlocksLogic, useValue: userBlocksLogic }, // MockUserBlocksLogic}
      ],
    })
      .useMocker(createMock)
      .compile();

    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(permissionsService).toBeDefined();
  });

  describe('conversation permission can return a permission', () => {
    const conversationId = String(new ObjectId());
    const applicantId = new ObjectId();
    const blockedApplicantId = new ObjectId();
    const universityId = new ObjectId();

    const mockMembers = Array.from({ length: 1000 }, () => new ObjectId());

    beforeAll(() => {
      userBlocksLogic.isUserBlocked.mockReturnValue(Promise.resolve(false));
      jest.spyOn(conversationData, 'getConversation').mockImplementation(() => {
        return Promise.resolve({
          id: conversationId,
          permissions: permissions,
          memberIds: [applicantId, ...mockMembers],
          blockedMemberIds: [blockedApplicantId],
          context: [{ id: universityId.toHexString(), type: 'university' }],
        });
      });
    });

    it('an applicant should be able to send a message to their conversation', async () => {
      userBlocksLogic.isUserBlocked.mockReturnValue(Promise.resolve(false));
      const user = {
        userId: applicantId,
        accountRole: 'applicant',
      };

      const permission = await permissionsService.conversationPermissions({
        user: user,
        conversationId,
        action: Action.sendMessage,
      });
      expect(permission).toEqual(true);
    });

    it('a staff member should be able to send a message to their conversation', async () => {
      const user = {
        userId: applicantId,
        accountRole: 'staff',
      };

      const permission = await permissionsService.conversationPermissions({
        user: user,
        conversationId,
        action: Action.sendMessage,
      });
      expect(permission).toEqual(true);
    });

    it('a member should not able to delete a message', async () => {
      const user = {
        userId: applicantId,
        accountRole: 'applicant',
      };

      const permission = await permissionsService.conversationPermissions({
        user: user,
        conversationId,
        action: Action.deleteMessage,
      });
      expect(permission).toEqual(false);
    });

    it('a university should be able to delete a message from their conversation', async () => {
      const user = {
        userId: new ObjectId(),
        accountRole: 'university',
        universityId: universityId,
      };

      const permission = await permissionsService.conversationPermissions({
        user,
        conversationId,
        action: Action.deleteMessage,
      });
      expect(permission).toEqual(true);
    });

    it('a university should not be able to delete a message from someone elses conversation', async () => {
      const user = {
        userId: new ObjectId(),
        accountRole: 'university',
        universityId: new ObjectId(),
      };

      const permission = await permissionsService.conversationPermissions({
        user,
        conversationId,
        action: Action.deleteMessage,
      });
      expect(permission).toEqual(false);
    });

    it('an admin should be able to delete a message from any conversation', async () => {
      const user = {
        userId: new ObjectId(),
        accountRole: 'admin',
      };

      const permission = await permissionsService.conversationPermissions({
        user,
        conversationId,
        action: Action.deleteMessage,
      });
      expect(permission).toEqual(true);
    });

    it('a blocked applicant should not be able to send a message to conversation', async () => {
      const blockedUser = {
        userId: blockedApplicantId,
        accountRole: 'applicant',
      };

      const permission = await permissionsService.conversationPermissions({
        user: blockedUser,
        conversationId,
        action: Action.sendMessage,
      });
      expect(permission).toEqual(false);
    });
  });

  describe('message permission returns permissions', () => {
    it('is defined', () => {
      expect(permissionsService.messagePermissions).toBeDefined();
    });
    const conversationId = String(new ObjectId());
    const applicantId = new ObjectId();
    const universityId = new ObjectId();
    const messageId = String(new ObjectId());

    const mockMembers = Array.from({ length: 1000 }, () => new ObjectId());

    beforeAll(() => {
      jest.clearAllMocks;
      jest.spyOn(conversationData, 'getConversation').mockImplementation(() => {
        return Promise.resolve({
          id: conversationId,
          permissions: permissions,
          memberIds: [applicantId, ...mockMembers],
          context: [{ id: universityId, type: 'university' }],
        });
      });

      jest.spyOn(<any>messageData, 'getMessage').mockImplementation(() => {
        return Promise.resolve({
          id: messageId,
          conversationId: conversationId,
          senderId: applicantId,
        });
      });
    });

    it('a user should be able to update their message', async () => {
      const user = {
        userId: applicantId,
        accountRole: 'applicant',
      };

      const permission = await permissionsService.messagePermissions({
        user: user,
        messageId,
        action: Action.updateMessage,
      });
      expect(permission).toEqual(true);
    });

    it('an admin should be able to update a users message', async () => {
      const user = {
        userId: new ObjectId(),
        accountRole: 'admin',
      };

      const permission = await permissionsService.messagePermissions({
        user: user,
        messageId,
        action: Action.updateMessage,
      });
      expect(permission).toEqual(true);
    });

    it('a user should not be able to update someone elses message', async () => {
      const user = {
        userId: new ObjectId(),
        accountRole: 'applicant',
      };

      const permission = await permissionsService.messagePermissions({
        user: user,
        messageId,
        action: Action.updateMessage,
      });
      expect(permission).toEqual(false);
    });

    describe('Community Permission Specific Test', () => {
      it('an applicant should be able to delete their own message', async () => {
        const user = {
          userId: applicantId,
          accountRole: 'applicant',
        };

        const permission = await permissionsService.messagePermissions({
          user: user,
          messageId,
          action: Action.deleteMessage,
        });
        expect(permission).toEqual(true);
      });

      it('an applicant should not be able to delete someone elses message', async () => {
        const newApplicantId = new ObjectId();
        const user = {
          userId: newApplicantId,
          accountRole: 'applicant',
        };

        const permission = await permissionsService.messagePermissions({
          user: user,
          messageId,
          action: Action.deleteMessage,
        });
        expect(permission).toEqual(false);
      });

      it('an university admin should be able to create a poll', async () => {
        jest
          .spyOn(conversationData, 'getConversation')
          .mockImplementation(() => {
            return Promise.resolve({
              id: conversationId,
              permissions: permissions,
              memberIds: [applicantId, ...mockMembers],
              blockedMemberIds: [],
              context: [{ id: universityId.toHexString(), type: 'university' }],
            });
          });

        const user = {
          userId: applicantId,
          accountRole: 'university',
        };

        const permission = await permissionsService.messagePermissions({
          user: user,
          messageId,
          action: Action.createPoll,
        });
        expect(permission).toEqual(true);
      });

      it('an applicant should not be able to create a poll', async () => {
        const newApplicantId = new ObjectId();
        const user = {
          userId: newApplicantId,
          accountRole: 'applicant',
        };

        const permission = await permissionsService.messagePermissions({
          user: user,
          messageId,
          action: Action.createPoll,
        });
        expect(permission).toEqual(false);
      });
    });
  });
});
