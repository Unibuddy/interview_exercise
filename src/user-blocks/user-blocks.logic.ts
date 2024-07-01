import { UserToUserBlockScope } from './dtos/userToUserBlockScope';
import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { UserBlockDTo, UserBlockScope } from './models/user-blocks.model';
import { UserBlocksData } from './user-blocks.data';

export interface IUserBlocksLogic {
  blockUser(userBlock: UserBlockDTo): Promise<UserBlockDTo>;
  getBlockedUsers(
    userIds: ObjectId[],
    scope: UserBlockScope,
  ): Promise<UserBlockDTo[]>;
  isUserBlocked(userId: ObjectId, scopes: UserBlockScope[]): Promise<boolean>;
  unblockUser(userId: ObjectId, scope: UserBlockScope): Promise<boolean>;
}

@Injectable()
export class UserBlocksLogic implements IUserBlocksLogic {
  constructor(private userBlocksData: UserBlocksData) {}

  blockUser(userBlock: UserBlockDTo): Promise<UserBlockDTo> {
    return this.userBlocksData.createUserBlock(userBlock);
  }

  /**
   *
   * @param userIds
   * @param scope
   * @returns the list of blocked users
   */
  async getBlockedUsers(
    userIds: ObjectId[],
    scope: UserBlockScope,
  ): Promise<UserBlockDTo[]> {
    return await this.userBlocksData.getBlockedUsers(userIds, scope);
  }

  async isUserBlocked(
    userId: ObjectId,
    scopes: UserBlockScope[],
  ): Promise<boolean> {
    const result = await this.userBlocksData.countUserBlocks(userId, scopes);
    return result > 0;
  }

  async unblockUser(userId: ObjectId, scope: UserBlockScope): Promise<boolean> {
    const result = await this.userBlocksData.deleteUserBlock({
      blockedUserId: userId,
      scope: scope.scope,
      scopeId: scope.scopeId,
    });
    if (result) return true;
    return false;
  }

  async unblockUserToUser(
    blockerUserId: ObjectId,
    blockedUserId: ObjectId,
  ): Promise<boolean> {
    const result = await this.userBlocksData.deleteUserBlock({
      blockedUserId: blockedUserId,
      blockingUserId: blockerUserId,
      scope: UserToUserBlockScope.scope,
      scopeId: new ObjectId(UserToUserBlockScope.scopeId),
    });
    if (result) return true;
    return false;
  }

  async userToUserBlockingExists(
    firstUserId: ObjectId,
    secondUserId: ObjectId,
  ): Promise<boolean> {
    const results = await this.userBlocksData.getUserToUserBlocks(
      firstUserId,
      secondUserId,
    );

    return results?.length > 0;
  }
}
