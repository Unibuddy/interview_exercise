import { GraphQLClient } from 'graphql-request';
import request from 'supertest';
import { ObjectID } from 'mongodb';
import { mockServerClient } from 'mockserver-client';

import { createDirectConversationForTest } from './helpers/conversation.utils';
import { createClient } from './helpers/createClient';
import { sendConversationMessageMutation } from './helpers/gqlSnipetts';
import { ChatConversation } from '../src/conversation/models/ChatConversation.entity';
import { getLocalConfig } from '../src/configuration/configuration-manager.utils';

const applicationUrl = process.env.APP_URL;
const applicationApiKey = getLocalConfig().auth.apiKeyForClients;

describe('Direct Conversation Block User Functionality', () => {
  let blockedClient: GraphQLClient;
  let conversation: ChatConversation;

  const userToConverseWith = String(new ObjectID());
  const currentUserId = String(new ObjectID());

  beforeAll(async () => {
    conversation = await createDirectConversationForTest({
      currentUserId,
      userToConverseWith,
    });
    const blockedUserToSign = {
      identity: {
        account_role: 'applicant',
        user_id: userToConverseWith,
      },
    };

    blockedClient = createClient(blockedUserToSign);
  });

  it('Prior to block the user can send message', async () => {
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).reset();
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${userToConverseWith}`,
      {
        id: userToConverseWith,
        email: 'some@email.co',
        firstName: 'Dark',
        lastName: 'Knight',
        profilePhoto: undefined,
        accountRole: undefined,
      },
      200,
    );
    const result = await blockedClient.request(
      sendConversationMessageMutation,
      {
        messageDto: {
          text: 'I will be blocked after this',
          conversationId: conversation.id,
        },
      },
    );

    expect(result.sendConversationMessage).toMatchObject({
      id: expect.anything(),
      text: 'I will be blocked after this',
      sender: { id: userToConverseWith },
      created: expect.anything(),
      deleted: false,
      resolved: false,
    });
  });

  it('successfully executes block request for the user', async () => {
    const response = await request(applicationUrl)
      .post('/user-blocks/toggle')
      .send({
        blocked_user: userToConverseWith,
        blocker: currentUserId,
        set_blocked: true,
        blocker_type: 'user',
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': applicationApiKey,
        Accept: 'application/json',
      });
    expect(response.status).toEqual(201);
  });

  it('the blocked user can no longer send a message', async () => {
    let result;
    try {
      result = await blockedClient.request(sendConversationMessageMutation, {
        messageDto: {
          text: 'message from block user',
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      result = error.response;
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'User is not authorised to send this message',
        }),
      ]),
    );
  });

  it('successfully executes unblock request for the user', async () => {
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).reset();
    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${userToConverseWith}`,
      {
        id: userToConverseWith,
        email: 'some@email.co',
        firstName: 'Dark',
        lastName: 'Knight',
        profilePhoto: undefined,
        accountRole: undefined,
      },
      200,
    );
    const response = await request(applicationUrl)
      .post('/user-blocks/toggle')
      .send({
        blocked_user: userToConverseWith,
        blocker: currentUserId,
        set_blocked: false,
        blocker_type: 'user',
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': applicationApiKey,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(201);
  });

  it('Unblocked user can start sending messages again', async () => {
    const result = await blockedClient.request(
      sendConversationMessageMutation,
      {
        messageDto: {
          text: 'message after unblocking',
          conversationId: conversation.id,
        },
      },
    );

    expect(result).toEqual({
      sendConversationMessage: {
        id: expect.anything(),
        text: 'message after unblocking',
        created: expect.anything(),
        sender: { id: userToConverseWith },
        deleted: false,
        resolved: false,
      },
    });
  });
});
