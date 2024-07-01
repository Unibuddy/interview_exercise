import { Action, Subject } from './../../permissions/models/permissions.model';

export const DirectConversationDefaultPermissions = [
  {
    action: Action.readConversation,
    subject: Subject.user,
    conditions: {
      userId: {
        $in: 'conversation.memberIds',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: Action.sendMessage,
    subject: Subject.user,
    conditions: {
      userId: {
        $in: 'conversation.memberIds',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: Action.updateMessage,
    subject: Subject.user,
    conditions: {
      userId: {
        $eq: 'message.senderId',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: Action.deleteMessage,
    subject: Subject.user,
    conditions: {
      userId: {
        $eq: 'message.senderId',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: Action.pinMessage,
    subject: Subject.user,
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
    },
  },
];
