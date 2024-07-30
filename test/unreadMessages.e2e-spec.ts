import { isValidObjectId } from 'mongoose';
import { gql, GraphQLClient } from 'graphql-request';
import request, { Response } from 'supertest';
import { ObjectId } from 'mongodb';
import { mockServerClient } from 'mockserver-client';
import { createClient } from './helpers/createClient';
import { createConversationWithCommunityPermissions } from './helpers/conversation.utils';
import {
  recordLastMessageReadByUserMutation,
  sendConversationMessageMutation,
} from './helpers/gqlSnipetts';
import { getLocalConfig } from '../src/configuration/configuration-manager.utils';
import { ChatConversation } from '../src/conversation/models/ChatConversation.entity';
import { ChatMessage } from '../src/message/models/message.entity';

const applicationUrl = process.env.APP_URL;
const API_KEY = getLocalConfig().auth.apiKeyForClients;

const getConversation = gql`
  query ($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on ChatConversation {
        id
        unreadMessageCount
        lastMessage {
          id
        }
      }
    }
  }
`;
type GetConversationVariablesType = {
  representations: { __typename: string; id: string }[];
};

describe('Unread Message Count', () => {
  const thisUser = new ObjectId().toHexString();
  const anotherUser = new ObjectId().toHexString();
  let thisConversation: ChatConversation;
  let client: GraphQLClient;
  let anotherClient: GraphQLClient;
  let addMemberResponse1: Response;
  let addMemberResponse2: Response;
  let getConversationVariables: GetConversationVariablesType;

  beforeAll(async () => {
    thisConversation = await createConversationWithCommunityPermissions();
    getConversationVariables = {
      representations: [
        {
          __typename: 'ChatConversation',
          id: thisConversation.id,
        },
      ],
    };
    const toSign = {
      identity: {
        account_role: 'applicant',
        user_id: `${thisUser}`,
      },
    };
    client = createClient(toSign);
    const toSignAnother = {
      identity: {
        account_role: 'applicant',
        user_id: `${anotherUser}`,
      },
    };
    anotherClient = createClient(toSignAnother);
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${thisUser}`,
      {
        id: thisUser,
        firstName: 'Aman',
        lastName: 'Srivastava',
        profilePhoto: null,
      },
      200,
    );
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${anotherUser}`,
      {
        id: anotherUser,
        firstName: 'Antoine',
        lastName: 'Laurent',
        profilePhoto: null,
      },
      200,
    );
    addMemberResponse1 = await request(applicationUrl)
      .post(`/conversation/${thisConversation.id}/member`)
      .send({
        userId: `${thisUser}`,
      })
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
    addMemberResponse2 = await request(applicationUrl)
      .post(`/conversation/${thisConversation.id}/member`)
      .send({
        userId: `${anotherUser}`,
      })
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
  });

  describe('initial setup check', () => {
    it('creates a new conversation', () => {
      expect(isValidObjectId(thisConversation.id)).toBe(true);
    });
    it('first addMember is successful', () => {
      expect(addMemberResponse1.status).toEqual(201);
    });
    it('second addMember is successful', () => {
      expect(addMemberResponse2.status).toEqual(201);
    });
  });

  describe('Run Full Lifecycle', () => {
    let conv: { lastMessage: { id: any }; unreadMessageCount: any };
    let message: { sendConversationMessage: { id: string } };
    let messageId: string;
    let recordLastMessageResponse: { recordLastMessageReadByUser: any };
    let getConversationResponse: { _entities: (typeof conv)[] };

    beforeAll(async () => {
      message = await anotherClient.request(sendConversationMessageMutation, {
        messageDto: {
          text: 'Sample message',
          conversationId: new ObjectId(thisConversation.id),
        },
      });
      messageId = message.sendConversationMessage.id;

      recordLastMessageResponse = await client.request(
        recordLastMessageReadByUserMutation,
        {
          markReadMessageDto: {
            conversationId: new ObjectId(thisConversation.id),
            messageId,
          },
        },
      );
      getConversationResponse = await client.request(
        getConversation,
        getConversationVariables,
      );
      [conv] = getConversationResponse._entities;
    });

    it('conversation automatically registers lastMessageId on the conversation', () => {
      expect(conv.lastMessage).toBeDefined();
      expect(conv.lastMessage.id).toEqual(messageId);
    });

    it('conversation contains the unreadMessageCount', () => {
      expect(conv.unreadMessageCount).toBeDefined();
      expect(conv.unreadMessageCount).toBeGreaterThanOrEqual(0);
    });

    it('users last read message is registered on the conversation', async () => {
      expect(recordLastMessageResponse.recordLastMessageReadByUser).toEqual({
        conversationId: thisConversation.id,
        messageId: messageId,
        userId: thisUser,
      });
    });
  });
});
