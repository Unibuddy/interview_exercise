import { isValidObjectId } from 'mongoose';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import { mockServerClient } from 'mockserver-client';
import { createClient } from './helpers/createClient';
import { chatPermissions } from './helpers/conversation.utils';
import {
  getChatConversationMessages,
  recordLastMessageReadByUserMutation,
  sendConversationMessageMutation,
} from './helpers/gqlSnipetts';
import { getLocalConfig } from '../src/configuration/configuration-manager.utils';

const applicationUrl = process.env.APP_URL;
const API_KEY = getLocalConfig().auth.apiKeyForClients;

const newPermissions = [
  {
    action: 'readConversation',
    subject: 'User',
    conditions: { userId: { $in: 'conversation.universityids' } },
  },
  {
    action: 'readConversation',
    subject: 'User',
    conditions: {
      userId: {
        $in: 'conversation.universityids',
      },
    },
  },
];

describe('Conversation', () => {
  const universityId = new ObjectId();
  const userId = `${new ObjectId()}`;
  const someId = `${new ObjectId()}`;
  let conversationId: string;

  beforeAll(async () => {
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
  });

  it('can create a conversation (/conversation (POST))', async () => {
    const response = await request(applicationUrl)
      .post('/conversation')
      .send({
        product: 'community',
        context: [
          {
            id: String(universityId),
            type: 'university',
          },
        ],
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });
    expect(response.status).toEqual(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.anything(),
      }),
    );
    expect(isValidObjectId(response.body.id)).toBe(true);
  });

  it('can create a conversation with permissions (/conversation (POST))', async () => {
    const response = await request(applicationUrl)
      .post('/conversation')
      .send({
        product: 'community',
        context: [
          {
            id: String(universityId),
            type: 'university',
          },
        ],
        permissions: chatPermissions,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.anything(),
      }),
    );
    expect(isValidObjectId(response.body.id)).toBe(true);
    conversationId = response.body.id;
  });

  it('allows a user to be added to a community', async () => {
    const response = await request(applicationUrl)
      .post(`/conversation/${conversationId}/member`)
      .send({
        userId: `${userId}`,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: conversationId,
        memberIds: expect.arrayContaining([`${userId}`]),
      }),
    );
  });

  const secondUser = `${new ObjectId()}`;

  it('allows a second user to be added to a community', async () => {
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${secondUser}`,
      {
        id: secondUser,
        firstName: 'John',
        lastName: 'Doe',
        profilePhoto: null,
      },
      200,
    );

    const response = await request(applicationUrl)
      .post(`/conversation/${conversationId}/member`)
      .send({
        userId: secondUser,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: conversationId,
        memberIds: expect.arrayContaining([`${userId}`, secondUser]),
      }),
    );
  });

  it('allows a user to be removed from a community', async () => {
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${secondUser}`,
      {
        id: secondUser,
        firstName: 'John',
        lastName: 'Doe',
        profilePhoto: null,
      },
      200,
    );

    const response = await request(applicationUrl)
      .delete(`/conversation/${conversationId}/member/${secondUser}`)
      .send({
        userId: secondUser,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: conversationId,
        memberIds: [`${userId}`],
      }),
    );
  });

  it('allows a member to send a message', async () => {
    const toSign = {
      identity: {
        account_role: 'applicant',
        user_id: `${userId}`,
      },
    };

    const client = createClient(toSign);

    const result = await client.request(sendConversationMessageMutation, {
      messageDto: {
        text: 'End too end message',
        conversationId: conversationId,
      },
    });

    expect(result.sendConversationMessage).toEqual({
      id: expect.anything(),
      text: 'End too end message',
      sender: { id: userId },
      resolved: false,
      created: expect.anything(),
      deleted: false,
    });
  });

  it('prevents a non member from sending a message', async () => {
    const toSign = {
      identity: {
        account_role: 'applicant',
        user_id: `${secondUser}`,
      },
    };

    const client = createClient(toSign);
    let result;
    try {
      result = await client.request(sendConversationMessageMutation, {
        messageDto: {
          text: 'End to end message',
          conversationId: conversationId,
        },
      });
    } catch (error) {
      result = error.response;
    }

    expect(result.data).toEqual(null);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'User is not authorised to send this message',
        }),
      ]),
    );
  });

  it('prevents a non member from reading messages', async () => {
    const toSign = {
      identity: {
        account_role: 'applicant',
        user_id: `${secondUser}`,
      },
    };

    const client = createClient(toSign);
    let result;
    try {
      result = await client.request(getChatConversationMessages, {
        getMessageDto: {
          conversationId: conversationId,
          offsetId: `${new ObjectId()}`,
          limit: 1,
        },
      });
    } catch (error) {
      result = error.response;
    }

    expect(result.data).toEqual(null);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'User is not authorised to read this conversation',
        }),
      ]),
    );
  });

  it('Records last message read by user', async () => {
    const toSign = {
      identity: {
        account_role: 'applicant',
        user_id: `${userId}`,
      },
    };
    const testLastMessageId = `${new ObjectId()}`;

    const client = createClient(toSign);

    const result = await client.request(recordLastMessageReadByUserMutation, {
      markReadMessageDto: {
        conversationId,
        messageId: testLastMessageId,
      },
    });

    expect(result.recordLastMessageReadByUser).toEqual({
      conversationId,
      messageId: testLastMessageId,
      userId,
    });
  });

  it('gets unread message counts', async () => {
    const response = await request(applicationUrl)
      .get(`/conversation/unread-message-count/${userId}`)
      .query({ conversationIds: [conversationId] })
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });
    expect(response.status).toEqual(200);
    const expectedObj = [{ id: conversationId, unreadMessageCount: 1 }];
    expect(response.body).toEqual(expectedObj);
  });

  it('Successfully executes migrate permissions api and returns true', async () => {
    const response = await request(applicationUrl)
      .post(`/conversation/migrate-permissions`)
      .send({
        permissions: newPermissions,
        product: 'community',
        conversationIds: [someId],
      })
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({});
  });

  it('Raises error if api key is not provided', async () => {
    const response = await request(applicationUrl)
      .post(`/conversation/migrate-permissions`)
      .send({ permissions: newPermissions, product: 'community' })
      .set('Content-Type', 'application/json');
    expect(response.status).toEqual(401);
  });

  it('Raises error if product is not community', async () => {
    const response = await request(applicationUrl)
      .post(`/conversation/migrate-permissions`)
      .send({ permissions: newPermissions, product: 'virtualEvent' })
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });
    expect(response.status).toEqual(400);
  });

  it('Successfully executes migrate last message api and returns true', async () => {
    const response = await request(applicationUrl)
      .post(`/conversation/migrate-last-messages`)
      .send()
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({});
  });

  it('Raises error if api key is not provided -- migrate last messages', async () => {
    const response = await request(applicationUrl)
      .post(`/conversation/migrate-last-messages`)
      .send()
      .set('Content-Type', 'application/json');
    expect(response.status).toEqual(401);
  });
});
