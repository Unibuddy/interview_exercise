import { ApiProperty } from '@nestjs/swagger';

export enum Subject {
  user = 'User',
  all = 'all',
}

export enum Action {
  manage = 'manage',
  readConversation = 'readConversation',
  sendMessage = 'sendMessage',
  updateMessage = 'updateMessage',
  deleteMessage = 'deleteMessage',
  resolveMessage = 'resolveMessage',
  pinMessage = 'pinMessage',
  createPoll = 'createPoll',
}

export enum AccountRole {
  applicant = 'applicant',
  mentor = 'mentor',
  staff = 'staff',
  university = 'university',
  admin = 'admin',
}

export enum ConditionField {
  messageSenderId = 'message.senderId',
  conversationMemberIds = 'conversation.memberIds',
  conversationBlockedMemberIds = 'conversation.blockedMemberIds',
  conversationUniversityIds = 'conversation.universityIds',
}

export class Conditions {
  @ApiProperty({ required: false })
  userId?: any;
  @ApiProperty({ required: false })
  universityId?: any;
  @ApiProperty({ required: false, enum: AccountRole })
  accountRole?: AccountRole;
}
