import { ObjectId } from 'mongodb';
import request from 'supertest';
import { GraphQLClient } from 'graphql-request';
import { createClient } from './helpers/createClient';
import { getLocalConfig } from '../src/configuration/configuration-manager.utils';
import {
  Context,
  ContextType,
} from '../src/conversation/models/ContextSchema.dto';
import { IUBJwt } from '../src/authentication/jwt.strategy';
import { conversationInboxEntity } from './helpers/gqlSnipetts';
import { mockServerClient } from 'mockserver-client';

const APP_URL = process.env.APP_URL;
const UNIVERSITY_ID_1 = new ObjectId('321b1a570ff321b1a570ff01');
const UNIVERSITY_ID_2 = new ObjectId('321b1a570ff321b1a570ff02');
const USER_ID = new ObjectId();

async function createConversation(
  contexts?: Context[],
): Promise<request.Response> {
  const context: Context[] = contexts
    ? contexts
    : [
        {
          id: UNIVERSITY_ID_1.toHexString(),
          type: ContextType.university,
        },
      ];

  return await request(APP_URL)
    .post('/conversation')
    .send({
      product: 'community',
      context,
    })
    .set('Content-Type', 'application/json')
    .set({
      'x-api-key': getLocalConfig().auth.apiKeyForClients,
      Accept: 'application/json',
    });
}

async function addUserToConversation(
  userId: string,
  conversationId: string,
): Promise<request.Response> {
  return await request(APP_URL)
    .post(`/conversation/${conversationId}/member`)
    .send({
      userId: `${userId}`,
    })
    .set('Content-Type', 'application/json')
    .set({
      'x-api-key': getLocalConfig().auth.apiKeyForClients,
      Accept: 'application/json',
    });
}

async function addBenToConversation(userId: string) {
  await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
    `/api/v1/users/${userId}`,
    {
      id: userId,
      firstName: 'Ben',
      lastName: 'Giles',
      profilePhoto: null,
    },
    200,
  );
}

describe('Conversation Inbox', () => {
  let client: GraphQLClient;

  beforeAll(async () => {
    await addBenToConversation(USER_ID.toHexString());

    // Create 3 conversations
    // First one with just one context and the user
    const conversation1 = await createConversation();
    addUserToConversation(USER_ID.toHexString(), conversation1.body.id);

    await addBenToConversation(USER_ID.toHexString());

    // Second with two different contexts and the user
    const conversation2 = await createConversation([
      {
        id: UNIVERSITY_ID_1.toHexString(),
        type: ContextType.university,
      },
      {
        id: UNIVERSITY_ID_2.toHexString(),
        type: ContextType.university,
      },
    ]);
    addUserToConversation(USER_ID.toHexString(), conversation2.body.id);

    // Third created with default context and no user
    await createConversation();

    // Setup graphql client
    const userIdentityObject: IUBJwt = {
      identity: {
        user_id: USER_ID.toHexString(),
        account_role: 'applicant',
      },
    };

    client = createClient(userIdentityObject);
  });

  it('Should get 2 conversations for university 1 context with user', async () => {
    const result = await client.request(conversationInboxEntity, {
      representations: [
        {
          __typename: 'ConversationInbox',
          contexts: [{ id: UNIVERSITY_ID_1.toHexString(), type: 'university' }],
        },
      ],
    });

    expect(result._entities[0].conversations.length).toEqual(2);
  });

  it('Should get 1 conversations for university 2 context with user', async () => {
    const result = await client.request(conversationInboxEntity, {
      representations: [
        {
          __typename: 'ConversationInbox',
          contexts: [{ id: UNIVERSITY_ID_2.toHexString(), type: 'university' }],
        },
      ],
    });

    expect(result._entities[0].conversations.length).toEqual(1);
  });
});
