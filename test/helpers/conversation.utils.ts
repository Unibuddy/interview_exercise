import request from 'supertest';
import { ObjectID } from 'mongodb';
import { ChatConversation } from '../../src/conversation/models/ChatConversation.entity';
import { getLocalConfig } from '../../src/configuration/configuration-manager.utils';
import { DirectChatConversationDto } from '../../src/conversation/dto/DirectChatConversationDto';
import {
  ContextType,
  Product,
} from '../../src/conversation/models/ContextSchema.dto';

const applicationUrl = process.env.APP_URL;

export const chatPermissions = [
  {
    action: 'manage',
    subject: 'all',
    conditions: {
      accountRole: 'admin',
    },
  },
  {
    action: 'readConversation',
    subject: 'User',
    conditions: {
      userId: {
        $in: 'conversation.memberIds',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: 'sendMessage',
    subject: 'User',
    conditions: {
      userId: {
        $in: 'conversation.memberIds',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: 'updateMessage',
    subject: 'User',
    conditions: {
      userId: {
        $eq: 'message.senderId',
        $nin: 'conversation.blockedMemberIds',
      },
    },
  },
  {
    action: 'deleteMessage',
    subject: 'User',
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
      accountRole: 'university',
    },
  },
  {
    action: 'deleteMessage',
    subject: 'User',
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
      accountRole: 'mentor',
    },
  },
  {
    action: 'deleteMessage',
    subject: 'User',
    conditions: {
      universityId: { $in: 'conversation.universityIds' },
      accountRole: 'staff',
    },
  },
  {
    action: 'deleteMessage',
    subject: 'User',
    conditions: {
      userId: { $eq: 'message.senderId' },
      accountRole: 'applicant',
    },
  },
];

export async function createConversationForTest({
  product = 'community',
  universityId = new ObjectID(),
  permissions = [
    {
      action: 'manage',
      subject: 'all',
    },
  ],
} = {}): Promise<ChatConversation> {
  const response = await request(applicationUrl)
    .post('/conversation')
    .send({
      product,
      context: [
        {
          id: String(universityId),
          type: 'university',
        },
      ],
      permissions,
    })
    .set('Content-Type', 'application/json')
    .set({
      'x-api-key': getLocalConfig().auth.apiKeyForClients,
      Accept: 'application/json',
    });
  return response.body as ChatConversation;
}

export function createConversationWithCommunityPermissions() {
  return createConversationForTest({
    product: 'community',
    universityId: new ObjectID(),
    permissions: chatPermissions,
  });
}

export async function createDirectConversationForTest({
  currentUserId = new ObjectID().toHexString(),
  userToConverseWith = new ObjectID().toHexString(),
  universityId = new ObjectID().toHexString(),
}): Promise<ChatConversation> {
  const directChatConversationDto = new DirectChatConversationDto();
  directChatConversationDto.product = Product.community;
  directChatConversationDto.currentUserId = currentUserId;
  directChatConversationDto.userToConverseWith = userToConverseWith;
  directChatConversationDto.context = [
    {
      id: universityId,
      type: ContextType.university,
    },
  ];

  const response = await request(applicationUrl)
    .post('/conversation/direct')
    .send(directChatConversationDto)
    .set('Content-Type', 'application/json')
    .set({
      'x-api-key': getLocalConfig().auth.apiKeyForClients,
      Accept: 'application/json',
    });
  return response.body as ChatConversation;
}
