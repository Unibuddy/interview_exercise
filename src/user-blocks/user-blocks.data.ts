import { UserToUserBlockScope } from './dtos/userToUserBlockScope';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import {
  UserBlockDTo,
  UserBlockDocument,
  UserBlockModel,
  UserBlockScope,
} from './models/user-blocks.model';

export interface IUserBlocksData {
  countUserBlocks(userId: ObjectId, scopes: UserBlockScope[]): Promise<number>;
  createUserBlock(userBlock: UserBlockDTo): Promise<UserBlockDTo | null>;
  deleteUserBlock(userBlock: FilterQuery<UserBlockDocument>): Promise<number>;
  getBlockedUsers(
    userIds: ObjectId[],
    scope: UserBlockScope,
  ): Promise<UserBlockDTo[]>;
}

@Injectable()
export class UserBlocksData implements IUserBlocksData {
  constructor(
    @InjectModel(UserBlockModel.name)
    protected userBlockModel: Model<UserBlockDocument>,
  ) {}

  async countUserBlocks(
    userId: ObjectId,
    scopes: UserBlockScope[],
  ): Promise<number> {
    return await this.userBlockModel
      .count({ blockedUserId: userId })
      .or(scopes);
  }

  async createUserBlock(userBlock: UserBlockDTo): Promise<UserBlockDTo> {
    const createdDocument = await this.userBlockModel.create(userBlock);
    return this.convertDocumentToDto(createdDocument);
  }

  async deleteUserBlock(
    userBlock: FilterQuery<UserBlockDocument>,
  ): Promise<number> {
    const { deletedCount } = await this.userBlockModel.deleteOne(userBlock);
    if (deletedCount === null || deletedCount === undefined) {
      throw new Error('The user block does not exist to delete');
    }
    return deletedCount;
  }

  async getBlockedUsers(
    userIds: ObjectId[],
    scope: UserBlockScope,
  ): Promise<UserBlockDTo[]> {
    const query = {
      blockedUserId: { $in: userIds },
      scope: scope.scope,
      scopeId: scope.scopeId,
    };
    const result = await this.userBlockModel.find(query);

    return result.map(this.convertDocumentToDto);
  }

  async getUserToUserBlocks(
    firstUserId: ObjectId,
    secondUserId: ObjectId,
  ): Promise<UserBlockDTo[]> {
    const query = {
      blockedUserId: { $in: [firstUserId, secondUserId] },
      blockingUserId: { $in: [firstUserId, secondUserId] },
      scope: UserToUserBlockScope.scope,
    };
    const result = await this.userBlockModel.find(query);

    return result.map(this.convertDocumentToDto);
  }

  private convertDocumentToDto(document?: UserBlockDocument): UserBlockDTo {
    if (!document) {
      throw new Error('No User Blocks document found');
    }
    const { blockingUserId, blockedUserId, scope, scopeId } = document.toObject(
      {
        getters: true,
        virtuals: true,
        versionKey: false,
      },
    );
    return { blockingUserId, blockedUserId, scope, scopeId };
  }
}
