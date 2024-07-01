import { UserToUserBlockScope } from './dtos/userToUserBlockScope';
import { UserBlockDTo, UserBlockScope } from './models/user-blocks.model';
import { ChatConversationModel } from './../conversation/models/conversation.model';
import { ObjectID } from 'mongodb';
import { UserBlocksController } from './user-blocks.controller';
import { UserBlocksLogic } from './user-blocks.logic';
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationLogic } from '../conversation/conversation.logic';
import { BlockUserRequestDTO } from './dtos/blockUserRequest.dto';
import { ContextType } from '../conversation/models/ContextSchema.dto';

class MockUserBlocksLogic {
  blockUser() {
    return;
  }
  unblockUser() {
    return;
  }
  unblockUserToUser() {
    return;
  }
}

class MockConversationLogic {
  getExistingDirectConversation() {
    return {};
  }
  unblockMember() {
    return;
  }
  blockMember() {
    return;
  }
}

describe('user-blocks.controller', () => {
  let userBlocksLogic: UserBlocksLogic;
  let conversationLogic: ConversationLogic;
  let userBlocksController: UserBlocksController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserBlocksController],
      providers: [
        { provide: ConversationLogic, useClass: MockConversationLogic },
        { provide: UserBlocksLogic, useClass: MockUserBlocksLogic },
      ],
    }).compile();

    userBlocksController =
      module.get<UserBlocksController>(UserBlocksController);
    conversationLogic = module.get<ConversationLogic>(ConversationLogic);
    userBlocksLogic = module.get<UserBlocksLogic>(UserBlocksLogic);
  });

  it('should be defined', () => {
    expect(userBlocksController).toBeDefined();
    expect(userBlocksController.toggleUserBlock).toBeDefined();
  });

  describe('When conversation exits', () => {
    it('should call block in logic layer', async () => {
      const conversationBlockingLogicSpy = jest.spyOn(
        conversationLogic,
        'blockMember',
      );

      const conversationId = String(new ObjectID());
      jest
        .spyOn(conversationLogic, 'getExistingDirectConversation')
        .mockImplementation(() =>
          Promise.resolve({ id: conversationId } as ChatConversationModel),
        );

      const userBlockDto: BlockUserRequestDTO = {
        blocked_user: String(new ObjectID()),
        blocker_type: 'user',
        blocker: String(new ObjectID()),
        set_blocked: true,
      };
      const userBlockingLogicSpy = jest.spyOn(userBlocksLogic, 'blockUser');
      await userBlocksController.toggleUserBlock(userBlockDto);
      expect(conversationBlockingLogicSpy).toHaveBeenCalledWith(
        [conversationId],
        userBlockDto.blocked_user,
      );

      expect(userBlockingLogicSpy).toHaveBeenCalledWith({
        blockedUserId: new ObjectID(userBlockDto.blocked_user),
        blockingUserId: new ObjectID(userBlockDto.blocker),
        scope: ContextType.isDirectConversation,
        scopeId: new ObjectID(conversationId),
      } as UserBlockDTo);
    });

    it('should call unblock in logic layer', async () => {
      const conversationId = String(new ObjectID());
      jest
        .spyOn(conversationLogic, 'getExistingDirectConversation')
        .mockImplementation(() =>
          Promise.resolve({ id: conversationId } as ChatConversationModel),
        );

      const userBlockDto: BlockUserRequestDTO = {
        blocked_user: String(new ObjectID()),
        blocker_type: 'user',
        blocker: String(new ObjectID()),
        set_blocked: false,
      };
      const conversationBlockingLogicSpy = jest.spyOn(
        conversationLogic,
        'unblockMember',
      );
      const userBlockingLogicSpy = jest.spyOn(userBlocksLogic, 'unblockUser');
      await userBlocksController.toggleUserBlock(userBlockDto);
      expect(conversationBlockingLogicSpy).toHaveBeenCalledWith(
        [conversationId],
        userBlockDto.blocked_user,
      );

      expect(userBlockingLogicSpy).toHaveBeenCalledWith(
        new ObjectID(userBlockDto.blocked_user),
        {
          scope: ContextType.isDirectConversation,
          scopeId: new ObjectID(conversationId),
        } as UserBlockScope,
      );
    });
  });

  describe('When conversation does not exits', () => {
    it('should call block in logic layer', async () => {
      jest
        .spyOn(conversationLogic, 'getExistingDirectConversation')
        .mockImplementation(() => Promise.resolve(null));

      const userBlockDto: BlockUserRequestDTO = {
        blocked_user: String(new ObjectID()),
        blocker_type: 'user',
        blocker: String(new ObjectID()),
        set_blocked: true,
      };
      const userBlockingLogicSpy = jest.spyOn(userBlocksLogic, 'blockUser');
      await userBlocksController.toggleUserBlock(userBlockDto);
      expect(userBlockingLogicSpy).toHaveBeenCalledWith({
        blockedUserId: new ObjectID(userBlockDto.blocked_user),
        blockingUserId: new ObjectID(userBlockDto.blocker),
        scope: UserToUserBlockScope.scope,
        scopeId: new ObjectID(UserToUserBlockScope.scopeId),
      } as UserBlockDTo);
    });

    it('should call unblockUserToUser in logic layer', async () => {
      jest
        .spyOn(conversationLogic, 'getExistingDirectConversation')
        .mockImplementation(() => Promise.resolve(null));

      const userBlockDto: BlockUserRequestDTO = {
        blocked_user: String(new ObjectID()),
        blocker_type: 'user',
        blocker: String(new ObjectID()),
        set_blocked: false,
      };
      const userBlockingLogicSpy = jest.spyOn(
        userBlocksLogic,
        'unblockUserToUser',
      );
      await userBlocksController.toggleUserBlock(userBlockDto);
      expect(userBlockingLogicSpy).toHaveBeenCalledWith(
        new ObjectID(userBlockDto.blocker),
        new ObjectID(userBlockDto.blocked_user),
      );
    });
  });
});
