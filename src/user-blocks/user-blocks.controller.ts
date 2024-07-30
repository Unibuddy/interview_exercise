import { UserToUserBlockScope } from './dtos/userToUserBlockScope';
import { UserBlockScope, UserBlockDTo } from './models/user-blocks.model';
import { ObjectID } from 'mongodb';
import { Body, Controller, Post } from '@nestjs/common';
import { ConversationLogic } from '../conversation/conversation.logic';
import { BlockUserRequestDTO } from './dtos/blockUserRequest.dto';
import { UserBlocksLogic } from './user-blocks.logic';
import { ContextType } from '../conversation/models/ContextSchema.dto';

@Controller('user-blocks')
export class UserBlocksController {
  constructor(
    private userBlocksLogic: UserBlocksLogic,
    private conversationLogic: ConversationLogic,
  ) {}
  @Post('toggle')
  async toggleUserBlock(
    @Body() blockUserDTO: BlockUserRequestDTO,
  ): Promise<void> {
    /* Single endpoint to perform both blocking and unblocking
     * When set_blocked is true, do block, else do unblock
     * */
    const memberIds = [blockUserDTO.blocker, blockUserDTO.blocked_user];
    const conversation =
      await this.conversationLogic.getExistingDirectConversation(memberIds);
    if (!conversation) {
      if (blockUserDTO.set_blocked) {
        await this.userBlocksLogic.blockUser({
          blockedUserId: new ObjectID(blockUserDTO.blocked_user),
          blockingUserId: new ObjectID(blockUserDTO.blocker),
          scope: UserToUserBlockScope.scope,
          scopeId: new ObjectID(UserToUserBlockScope.scopeId),
        } as UserBlockDTo);
      } else {
        await this.userBlocksLogic.unblockUserToUser(
          new ObjectID(blockUserDTO.blocker),
          new ObjectID(blockUserDTO.blocked_user),
        );
      }

      return;
    }

    if (blockUserDTO.set_blocked) {
      // Perform blocking
      await Promise.all([
        this.conversationLogic.blockMember(
          [conversation.id],
          blockUserDTO.blocked_user,
        ),
        this.userBlocksLogic.blockUser({
          blockedUserId: new ObjectID(blockUserDTO.blocked_user),
          blockingUserId: new ObjectID(blockUserDTO.blocker),
          scope: ContextType.isDirectConversation,
          scopeId: new ObjectID(conversation.id),
        } as UserBlockDTo),
      ]);
    } else {
      // Perform unblocking
      await Promise.all([
        this.conversationLogic.unblockMember(
          [conversation.id],
          blockUserDTO.blocked_user,
        ),
        this.userBlocksLogic.unblockUser(
          new ObjectID(blockUserDTO.blocked_user),
          {
            scope: ContextType.isDirectConversation,
            scopeId: new ObjectID(conversation.id),
          } as UserBlockScope,
        ),
      ]);
    }
  }
}
