import { ConversationLogic } from './../conversation/conversation.logic';
import { Ability, subject } from '@casl/ability';
import { ChatMessageModel } from '../message/models/message.model';
import {
  ContextSchema,
  ContextType,
  Product,
} from '../conversation/models/ContextSchema.dto';
import { ChatConversationModel } from '../conversation/models/conversation.model';
import { AbilityFactory } from './ability-factory';
import { AccountRole, Action, Subject } from './models/permissions.model';
import { ObjectId } from 'mongodb';
import {
  IUserBlocksLogic,
  UserBlocksLogic,
} from '../user-blocks/user-blocks.logic';
import { Test, TestingModule } from '@nestjs/testing';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import {
  UserBlockScope,
  UserBlockDTo,
} from '../user-blocks/models/user-blocks.model';

const mockUser: IAuthenticatedUser = {
  userId: new ObjectId('597cfa3ac88c22000a74d222'),
  accountRole: 'university',
};
class MockUserBlocksLogic implements IUserBlocksLogic {
  getBlockedUsers(
    userIds: ObjectId[],
    scope: UserBlockScope,
  ): Promise<UserBlockDTo[]> {
    throw new Error('Method not implemented.');
  }
  isUserBlocked(userId: ObjectId, scopes: UserBlockScope[]): Promise<boolean> {
    return Promise.resolve(false);
  }
  blockUser(userBlock: UserBlockDTo): Promise<UserBlockDTo> {
    throw new Error('Method not implemented.');
  }
  unblockUser(userId: ObjectId, scope: UserBlockScope): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}

class MockConversationLogic {
  isDirectConversation(contexts: ContextSchema[]): boolean {
    return false;
  }
}

describe('AbilityFactory', () => {
  let abilityFactory: AbilityFactory;
  let userBlocksLogic: UserBlocksLogic;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbilityFactory,
        { provide: UserBlocksLogic, useClass: MockUserBlocksLogic },
        { provide: ConversationLogic, useClass: MockConversationLogic },
      ],
    }).compile();

    abilityFactory = module.get<AbilityFactory>(AbilityFactory);
    userBlocksLogic = module.get<UserBlocksLogic>(UserBlocksLogic);
  });

  it('should be defined', async () => {
    expect(abilityFactory).toBeDefined();
  });

  describe('Conversation permissions', () => {
    const testUniversityId = new ObjectId().toHexString();
    const secondTestUniversityId = new ObjectId().toHexString();
    const firstTestUser = new ObjectId().toHexString();
    const secondTestUser = new ObjectId().toHexString();
    const blockedUser = new ObjectId().toHexString();

    const mockConversation: ChatConversationModel = {
      id: 'I am  just here to keep the typing happy',
      product: Product.community,
      context: [
        {
          id: testUniversityId,
          type: ContextType.university,
        },
        {
          id: secondTestUniversityId,
          type: ContextType.university,
        },
      ],
      memberIds: [firstTestUser, secondTestUser],
      permissions: [],
      blockedMemberIds: [blockedUser],
      lastMessageId: new ObjectId(),
    };

    it('returns an empty set of abilities if the permissions array is empty', async () => {
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
      });

      expect(ability).toEqual([]);
    });

    it('replaces "conversation.memberIds" with a list of the members of the conversation', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $in: 'conversation.memberIds' } },
        },
      ];
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
        permissions,
      });

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $in: [firstTestUser, secondTestUser],
            },
          },
        },
      ]);
    });

    it('replaces "conversation.blockedMemberIds" with a list of blocked members of the conversation', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $nin: 'conversation.blockedMemberIds' } },
        },
      ];
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
        permissions,
      });

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $nin: [blockedUser],
            },
          },
        },
      ]);
    });

    it('replaces "conversation.blockedMemberIds" with a list of blocked members of the conversation', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $nin: 'conversation.blockedMemberIds' } },
        },
      ];
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
        permissions,
      });

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $nin: [blockedUser],
            },
          },
        },
      ]);
    });

    it('replaces "conversation.universityIds" with a list of the universityIds of the conversation', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { universityId: { $in: 'conversation.universityIds' } },
        },
      ];
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
        permissions,
      });

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            universityId: {
              $in: [testUniversityId, secondTestUniversityId],
            },
          },
        },
      ]);
    });

    it('does not replace message.senderId when there is no message, a user cannot perform the action', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $eq: 'message.senderId' } },
        },
      ];
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
        permissions,
      });

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {},
          },
        },
      ]);
      const user = {
        userId: '1234',
      };

      const ab = new Ability(ability);
      const userCanPerformAction = ab.can(
        'readConversation',
        subject(Subject.user, user),
      );
      expect(userCanPerformAction).toEqual(false);
    });

    it('returns a set of abilities', async () => {
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
            },
          },
        },
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: {
            userId: {
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
      ];
      const ability = await abilityFactory.factory(mockUser, {
        ...mockConversation,
        permissions,
      });

      expect(ability).toEqual([
        {
          action: 'manage',
          subject: 'all',
          conditions: {
            accountRole: 'admin',
          },
        },
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $in: [firstTestUser, secondTestUser],
            },
          },
        },
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $nin: [blockedUser],
            },
          },
        },
        {
          action: 'updateMessage',
          subject: 'User',
          conditions: {
            userId: {},
          },
        },
        {
          action: 'deleteMessage',
          subject: 'User',
          conditions: {
            universityId: {
              $in: [testUniversityId, secondTestUniversityId],
            },
            accountRole: 'university',
          },
        },
      ]);
    });
  });

  describe('Message permissions', () => {
    const testUniversityId = new ObjectId().toHexString();
    const secondTestUniversityId = new ObjectId().toHexString();
    const firstTestUser = new ObjectId().toHexString();
    const secondTestUser = new ObjectId().toHexString();
    const conversationId = new ObjectId();
    const senderId = new ObjectId();

    const mockConversation: ChatConversationModel = {
      id: String(conversationId),
      product: Product.community,
      context: [
        {
          id: testUniversityId,
          type: ContextType.university,
        },
        {
          id: secondTestUniversityId,
          type: ContextType.university,
        },
      ],
      memberIds: [firstTestUser, secondTestUser, String(senderId)],
      blockedMemberIds: [],
      permissions: [],
      lastMessageId: new ObjectId(),
    };
    const mockMessage: ChatMessageModel = {
      id: new ObjectId(),
      text: 'hello peeps',
      created: new Date(),
      sender: { id: String(senderId) },
      senderId,
      conversationId,
      deleted: false,
      resolved: false,
      conversation: { id: String(conversationId) },
      likes: [],
      likesCount: 0,
    };

    it('returns an empty set of abilities if the permissions array is empty', async () => {
      const ability = await abilityFactory.factory(
        mockUser,
        {
          ...mockConversation,
        },
        mockMessage,
      );

      expect(ability).toEqual([]);
    });

    it('replaces "conversation.memberIds" with a list of the members of the conversation', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $in: 'conversation.memberIds' } },
        },
      ];
      const ability = await abilityFactory.factory(
        mockUser,
        {
          ...mockConversation,
          permissions,
        },
        mockMessage,
      );

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $in: [firstTestUser, secondTestUser, String(senderId)],
            },
          },
        },
      ]);
    });

    it('replaces "conversation.universityIds" with a list of the universityIds of the conversation', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { universityId: { $in: 'conversation.universityIds' } },
        },
      ];
      const ability = await abilityFactory.factory(
        mockUser,
        {
          ...mockConversation,
          permissions,
        },
        mockMessage,
      );

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            universityId: {
              $in: [testUniversityId, secondTestUniversityId],
            },
          },
        },
      ]);
    });

    it('does replaces message.senderId when there is a message, and the user can perform the action', async () => {
      const permissions = [
        {
          action: Action.readConversation,
          subject: Subject.user,
          conditions: { userId: { $eq: 'message.senderId' } },
        },
      ];
      const ability = await abilityFactory.factory(
        mockUser,
        {
          ...mockConversation,
          permissions,
        },
        mockMessage,
      );

      expect(ability).toEqual([
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $eq: String(senderId),
            },
          },
        },
      ]);
      const user = {
        userId: String(senderId),
      };

      const ab = new Ability(ability);
      const userCanPerformAction = ab.can(
        'readConversation',
        subject(Subject.user, user),
      );
      expect(userCanPerformAction).toEqual(true);
    });

    it('returns a set of abilities', async () => {
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
          conditions: { userId: { $in: 'conversation.memberIds' } },
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
      ];
      const ability = await abilityFactory.factory(
        mockUser,
        {
          ...mockConversation,
          permissions,
        },
        mockMessage,
      );

      expect(ability).toEqual([
        {
          action: 'manage',
          subject: 'all',
          conditions: {
            accountRole: 'admin',
          },
        },
        {
          action: 'readConversation',
          subject: 'User',
          conditions: {
            userId: {
              $in: [firstTestUser, secondTestUser, String(senderId)],
            },
          },
        },
        {
          action: 'updateMessage',
          subject: 'User',
          conditions: {
            userId: {
              $eq: String(senderId),
            },
          },
        },
        {
          action: 'deleteMessage',
          subject: 'User',
          conditions: {
            universityId: {
              $in: [testUniversityId, secondTestUniversityId],
            },
            accountRole: 'university',
          },
        },
      ]);
    });

    it('should return empty permissions array if user is blocked', async () => {
      jest.spyOn(userBlocksLogic, 'isUserBlocked').mockImplementation(async () => {
        return true
      });

      const ability = await abilityFactory.factory(
        mockUser,
        {
          ...mockConversation,
          permissions: [{ action: Action.manage, subject: Subject.all }],
        },
        mockMessage,
      );

      expect(ability).toEqual([]);
    });
  });
});
