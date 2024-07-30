import { UserToUserBlockScope } from './dtos/userToUserBlockScope';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import {
  UserBlockModel,
  UserBlockSchema,
  UserBlockScope,
} from './models/user-blocks.model';
import { UserBlocksData } from './user-blocks.data';
import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { ConfigurationManager } from '../configuration/configuration-manager';

const USER_ID_BLOCKED = new ObjectId('abcdef123456abcdef000001');
const USER_ID_BLOCKING = new ObjectId('abcdef123456abcdef000002');
const SCOPE = 'university';
const SCOPE_ID = new ObjectId('abcdef123456abcdef000003');
const USER_BLOCK_SCOPE: UserBlockScope = {
  scope: SCOPE,
  scopeId: SCOPE_ID,
};

const USER_BLOCK = {
  blockedUserId: USER_ID_BLOCKED,
  blockingUserId: USER_ID_BLOCKING,
  scope: SCOPE,
  scopeId: SCOPE_ID,
};

class TestUserBlocksData extends UserBlocksData {
  async deleteMany() {
    await this.userBlockModel.deleteMany();
  }
}

describe('UserBlocksData', () => {
  let userBlocksData: TestUserBlocksData;

  beforeEach(async () => {
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
          { name: UserBlockModel.name, schema: UserBlockSchema },
        ]),
      ],
      providers: [TestUserBlocksData],
    }).compile();

    userBlocksData = module.get<TestUserBlocksData>(TestUserBlocksData);
  });

  afterEach(async () => {
    userBlocksData.deleteMany();
  });

  it('should be defined', () => {
    expect(userBlocksData).toBeDefined();
  });

  it('should create block and return user block count of more than 1', async () => {
    await userBlocksData.createUserBlock(USER_BLOCK);

    const blockCount = await userBlocksData.countUserBlocks(USER_ID_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);

    expect(blockCount).toEqual(1);
  });

  it('should return user count as 0 when block does not exist', async () => {
    const anotherUser = new ObjectId('abcdef123456abcdef000004');

    const blockCount = await userBlocksData.countUserBlocks(anotherUser, [
      USER_BLOCK_SCOPE,
    ]);

    expect(blockCount).toEqual(0);
  });

  it('should delete block', async () => {
    await userBlocksData.createUserBlock(USER_BLOCK);

    let blockCount = await userBlocksData.countUserBlocks(USER_ID_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);

    expect(blockCount).toEqual(1);

    await userBlocksData.deleteUserBlock(USER_BLOCK);

    blockCount = await userBlocksData.countUserBlocks(USER_ID_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);

    expect(blockCount).toEqual(0);
  });

  it('should return user block count when different scopes exist', async () => {
    // Create the test default object
    await userBlocksData.createUserBlock(USER_BLOCK);

    // One with scopeId different
    await userBlocksData.createUserBlock({
      ...USER_BLOCK,
      scopeId: new ObjectId('abcdef123456abcdef000004'),
    });

    // One with scope and scopeId different
    await userBlocksData.createUserBlock({
      ...USER_BLOCK,
      scope: 'event',
      scopeId: new ObjectId('abcdef123456abcdef000005'),
    });

    const blockCount = await userBlocksData.countUserBlocks(USER_ID_BLOCKED, [
      USER_BLOCK_SCOPE,
    ]);

    expect(blockCount).toEqual(1);
  });

  it('should retrieve the list of blocked users by userId,scopeId and scope', async () => {
    // Create the test default object
    await userBlocksData.createUserBlock(USER_BLOCK);

    const blockedUsers = await userBlocksData.getBlockedUsers(
      [USER_BLOCK.blockedUserId],
      USER_BLOCK_SCOPE,
    );

    expect(blockedUsers).toEqual([USER_BLOCK]);
  });

  it('should retrieve the list of user to user blocked data', async () => {
    const userToUserBlock = {
      blockedUserId: new ObjectId(),
      blockingUserId: new ObjectId(),
      scope: UserToUserBlockScope.scope,
      scopeId: new ObjectId(UserToUserBlockScope.scopeId),
    };
    await userBlocksData.createUserBlock(userToUserBlock);

    const blockedUsers = await userBlocksData.getUserToUserBlocks(
      userToUserBlock.blockedUserId,
      userToUserBlock.blockingUserId,
    );

    expect(blockedUsers).toEqual([userToUserBlock]);
  });
});
