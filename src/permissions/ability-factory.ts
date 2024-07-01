import { ConversationLogic } from './../conversation/conversation.logic';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { UserBlocksLogic } from '../user-blocks/user-blocks.logic';
import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import {
  extractUniversityIdsFromContext,
  getUniversityContexts,
} from '../conversation/extractUniversityIdsFromContext';
import { ChatConversationModel } from '../conversation/models/conversation.model';
import { ChatMessageModel } from '../message/models/message.model';
import { ConditionField } from './models/permissions.model';
import {
  ContextSchema,
  ContextType,
} from '../conversation/models/ContextSchema.dto';
import { UserBlockScope } from '../user-blocks/models/user-blocks.model';

@Injectable()
export class AbilityFactory {
  constructor(
    private userBlocksLogic: UserBlocksLogic,
    @Inject(forwardRef(() => ConversationLogic))
    private conversationLogic: ConversationLogic,
  ) {}

  private async isBlockedOnDirectConversation(
    contexts: ContextSchema[],
    userId: ObjectId,
    conversationId: string,
  ): Promise<boolean> {
    const isDirectConversation =
      this.conversationLogic.isDirectConversation(contexts);
    if (!isDirectConversation) {
      return false;
    }

    return await this.userBlocksLogic.isUserBlocked(userId, [
      {
        scopeId: new ObjectId(conversationId),
        scope: ContextType.isDirectConversation,
      },
    ]);
  }

  async factory(
    user: IAuthenticatedUser,
    conversation: ChatConversationModel,
    message?: ChatMessageModel,
  ) {
    if (!conversation) {
      return [];
    }
    const {
      id,
      permissions = [],
      memberIds,
      blockedMemberIds,
      context,
    } = conversation;


    const userBlockScopes: UserBlockScope[] = getUniversityContexts(
      context,
    ).map((currentContext) => ({
      // "currentContext.type" is always for university scope only as context is filtered in getUniversityContexts function
      scope: currentContext.type,
      scopeId: new ObjectId(currentContext.id),
    }));
    const isUserBlockedUniversityScope =
      await this.userBlocksLogic.isUserBlocked(user.userId, userBlockScopes);

    if (
      isUserBlockedUniversityScope ||
      (await this.isBlockedOnDirectConversation(context, user.userId, id))
    )
      return [];

    let senderId: string;

    if (message) {
      senderId = String(message.senderId);
    }

    const universityIds = extractUniversityIdsFromContext({
      conversationContext: context,
    });

    const hydratedPermissions = JSON.parse(
      JSON.stringify(permissions),
      (key, value) => {
        if (value === ConditionField.messageSenderId) {
          return senderId;
        }
        if (value === ConditionField.conversationMemberIds) {
          return memberIds;
        }
        if (value === ConditionField.conversationBlockedMemberIds) {
          return blockedMemberIds;
        }
        if (value === ConditionField.conversationUniversityIds) {
          return universityIds;
        }
        return value;
      },
    );

    return hydratedPermissions;
  }
}
