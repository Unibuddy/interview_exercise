import { Ability, subject } from '@casl/ability';
import { Injectable } from '@nestjs/common';

import { IAuthenticatedUser } from '../authentication/jwt.strategy';
import { ConversationData } from '../conversation/conversation.data';

import { MessageData } from '../message/message.data';
import { AbilityFactory } from './ability-factory';
import { Action, Subject } from './models/permissions.model';

type AuthenticatedUser = {
  userId: string;
  accountRole: string;
  universityId?: string;
  marketplaceId?: string;
};
@Injectable()
export class PermissionsService {
  constructor(
    private conversationData: ConversationData,
    private messageData: MessageData,
    private abilityFactory: AbilityFactory,
  ) {}

  private stringifyUser(user: IAuthenticatedUser): AuthenticatedUser {
    const { userId, universityId, accountRole, marketplaceId } = user;
    return {
      userId: String(userId),
      accountRole,
      universityId: universityId ? String(universityId) : undefined,
      marketplaceId: marketplaceId ? String(marketplaceId) : undefined,
    };
  }
  async conversationPermissions({
    user,
    conversationId,
    action,
  }: {
    user: IAuthenticatedUser;
    conversationId: string;
    action: Action;
  }): Promise<boolean> {
    const conversation = await this.conversationData.getConversation(
      conversationId,
    );

    const ability = new Ability(
      await this.abilityFactory.factory(user, conversation),
    );

    return ability.can(action, subject(Subject.user, this.stringifyUser(user)));
  }

  async messagePermissions({
    user,
    messageId,
    action,
  }: {
    user: IAuthenticatedUser;
    messageId: string;
    action: Action;
  }): Promise<boolean> {
    const message = await this.messageData.getMessage(messageId);

    const conversation = await this.conversationData.getConversation(
      String(message.conversationId),
    );

    const ability = new Ability(
      await this.abilityFactory.factory(user, conversation, message),
    );

    return ability.can(action, subject(Subject.user, this.stringifyUser(user)));
  }
}
