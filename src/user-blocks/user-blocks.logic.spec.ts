import { Test, TestingModule } from '@nestjs/testing';
import { FilterQuery, ObjectId } from 'mongodb';
import {
  UserBlockDocument,
  UserBlockDTo,
  UserBlockScope,
} from './models/user-blocks.model';
import { IUserBlocksData, UserBlocksData } from './user-blocks.data';
import { UserBlocksLogic } from './user-blocks.logic';

const USER_ID_NOT_BLOCKED = new ObjectId('abcdef123456abcdef000000');
const USER_ID_BLOCKED = new ObjectId('abcdef123456abcdef000001');
const USER_ID_BLOCKING = new ObjectId('abcdef123456abcdef000002');
const SCOPE = 'university';
const A_SCOPE = 'a_scope';
const SCOPE_ID = new ObjectId('abcdef123456abcdef000003');
const A_SCOPE_ID = new ObjectId('abcdef123456abcdef000004');

const USER_BLOCK_SCOPE: UserBlockScope = {
  scope: SCOPE,
  scopeId: SCOPE_ID,
};

const USER_NOT_BLOCKED_SCOPE: UserBlockScope = {
  scope: A_SCOPE,
  scopeId: A_SCOPE_ID,
};

const USER_BLOCK = {
  blockedUserId: USER_ID_BLOCKED,
  blockingUserId: USER_ID_BLOCKING,
  scope: SCOPE,
  scopeId: SCOPE_ID,
};

class MockUserBlocksData implements IUserBlocksData {
  countUserBlocks(userId: ObjectId, scopes: UserBlockScope[]): Promise<number> {
    if (userId.toHexString() === USER_ID_BLOCKED.toHexString()) {
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  }
  createUserBlock(userBlock: UserBlockDTo): Promise<UserBlockDTo> {
    return Promise.resolve({
      ...userBlock,
      id: new ObjectId('abcdef123456abcdef000004').toHexString(),
    });
  }
  deleteUserBlock(userBlock: FilterQuery<UserBlockDocument>): Promise<number> {
    if (userBlock.id.toHexString() === USER_ID_BLOCKED.toHexString()) {
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  }
  getBlockedUsers(
    userIds: [ObjectId],
    scope: UserBlockScope,
  ): Promise<UserBlockDTo[]> {
    if (
      userIds[0].toHexString() == [USER_ID_BLOCKED][0].toHexString() &&
      scope.scopeId.toHexString() == SCOPE_ID.toHexString() &&
      scope.scope === SCOPE
    ) {
      return Promise.resolve([
        {
          blockedUserId: USER_ID_BLOCKED,
          blockingUserId: USER_ID_BLOCKING,
          scope: SCOPE,
          scopeId: SCOPE_ID,
        },
      ]);
    }

    return Promise.resolve([]);
  }

  getUserToUserBlocks() {
    return;
  }
}

describe('UserBlocksData', () => {
  let userBlocksData: UserBlocksData;
  let userBlocksLogic: UserBlocksLogic;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBlocksLogic,
        { provide: UserBlocksData, useClass: MockUserBlocksData },
      ],
    }).compile();

    userBlocksData = module.get<UserBlocksData>(UserBlocksData);
    userBlocksLogic = module.get<UserBlocksLogic>(UserBlocksLogic);
  });

  it('should be defined', () => {
    expect(userBlocksLogic).toBeDefined();
  });

  it('should return true when data layer returns block objects', async () => {
    const countUserBlocksSpy = jest.spyOn(userBlocksData, 'countUserBlocks');

    const isBlocked = await userBlocksLogic.isUserBlocked(USER_ID_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);

    expect(countUserBlocksSpy).toBeCalledWith(USER_ID_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);
    expect(isBlocked).toEqual(true);
  });

  it('should return false when data layer does not returns block objects', async () => {
    const countUserBlocksSpy = jest.spyOn(userBlocksData, 'countUserBlocks');

    const isBlocked = await userBlocksLogic.isUserBlocked(USER_ID_NOT_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);

    expect(countUserBlocksSpy).toBeCalledWith(USER_ID_NOT_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);
    expect(isBlocked).toEqual(false);
  });

  it('should block user by creating a user block', async () => {
    const countUserBlocksSpy = jest.spyOn(userBlocksData, 'createUserBlock');

    const userBlock = await userBlocksLogic.blockUser(USER_BLOCK);

    expect(countUserBlocksSpy).toHaveBeenCalledTimes(1);
    expect(userBlock).toMatchObject({
      ...USER_BLOCK,
      id: 'abcdef123456abcdef000004',
    });
  });

  it('should return list of blocked users matches userId, scopeId and scope in blocked table', async () => {
    const countUserBlocksSpy = jest.spyOn(userBlocksData, 'getBlockedUsers');

    const blockedUsers = await userBlocksLogic.getBlockedUsers(
      [USER_ID_BLOCKED],
      USER_BLOCK_SCOPE,
    );

    expect(countUserBlocksSpy).toBeCalledWith(
      [USER_ID_BLOCKED],
      USER_BLOCK_SCOPE,
    );
    expect(blockedUsers).toEqual([USER_BLOCK]);
  });

  it('should return null, if userId or scopeId or scope does not match the blocked table', async () => {
    const countUserBlocksSpy = jest.spyOn(userBlocksData, 'getBlockedUsers');

    const blockedUsers = await userBlocksLogic.getBlockedUsers(
      [USER_ID_NOT_BLOCKED],
      USER_NOT_BLOCKED_SCOPE,
    );

    expect(countUserBlocksSpy).toBeCalledWith(
      [USER_ID_NOT_BLOCKED],
      USER_NOT_BLOCKED_SCOPE,
    );
    expect(blockedUsers).toEqual([]);
  });

  describe('userToUserBlockingExists tests', () => {
    const currentUserId = new ObjectId();
    const otherUserId = new ObjectId();
    it('userToUserBlockingExists: should return false when data layer does not returns block objects', async () => {
      const userToUserBlockingExistsSpy = jest.spyOn(
        userBlocksData,
        'getUserToUserBlocks',
      );

      const isBlocked = await userBlocksLogic.userToUserBlockingExists(
        currentUserId,
        otherUserId,
      );

      expect(userToUserBlockingExistsSpy).toBeCalledWith(
        currentUserId,
        otherUserId,
      );
      expect(isBlocked).toEqual(false);
    });

    it('userToUserBlockingExists: should return true when data layer returns block objects', async () => {
      const userToUserBlockingExistsSpy = jest
        .spyOn(userBlocksData, 'getUserToUserBlocks')
        .mockImplementation(() =>
          Promise.resolve([
            {
              blockedUserId: USER_ID_BLOCKED,
              blockingUserId: USER_ID_BLOCKING,
              scope: SCOPE,
              scopeId: SCOPE_ID,
            },
          ]),
        );

      const isBlocked = await userBlocksLogic.userToUserBlockingExists(
        currentUserId,
        otherUserId,
      );

      expect(userToUserBlockingExistsSpy).toBeCalledWith(
        currentUserId,
        otherUserId,
      );
      expect(isBlocked).toEqual(true);
    });
  });
});
