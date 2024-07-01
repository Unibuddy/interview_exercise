import { GraphQLClient } from 'graphql-request';
import request from 'supertest';
import { ObjectID } from 'mongodb';
import { mockServerClient } from 'mockserver-client';

import {
  createConversationForTest,
  chatPermissions,
} from './helpers/conversation.utils';
import { createClient } from './helpers/createClient';
import { sendConversationMessageMutation } from './helpers/gqlSnipetts';
import { ChatConversation } from '../src/conversation/models/ChatConversation.entity';
import { getLocalConfig } from '../src/configuration/configuration-manager.utils';

const applicationUrl = process.env.APP_URL;
const applicationApiKey = getLocalConfig().auth.apiKeyForClients;

describe('Block User Functionality', () => {
  let client: GraphQLClient;
  let conversation1: ChatConversation;
  let conversation2: ChatConversation;
  const blockedMemberId =  String(new ObjectID());

  beforeAll(async () => {
    const baseArgs = {
      product: 'community',
      universityId: new ObjectID(),
      permissions: chatPermissions,
    };
    conversation1 = await createConversationForTest(baseArgs);
    conversation2 = await createConversationForTest(baseArgs);
    const toSign = {
      identity: {
        account_role: 'applicant',
        user_id: blockedMemberId,
      },
    };


    await mockServerClient(process.env.MOCK_USER_SERVICE ?? '', 1080).mockSimpleResponse(
      `/api/v1/users/${blockedMemberId}`,
      {
        id: blockedMemberId,
        firstName: 'Dark',
        lastName: 'Knight',
        profilePhoto: null,
      },
      200,
    );

    for (const conv of [conversation1, conversation2]) {
      await request(applicationUrl)
        .post(`/conversation/${conv.id}/member`)
        .send({
          userId: `${blockedMemberId}`,
        })
        .set('Content-Type', 'application/json')
        .set({
          'x-api-key': getLocalConfig().auth.apiKeyForClients,
          Accept: 'application/json',
        });
    }

    client = createClient(toSign);

  });

  it('Prior to block the user can send message', async () => {
    for (const conv of [conversation1, conversation2]) {
      const result = await client.request(sendConversationMessageMutation, {
        messageDto: {
          text: 'End to end message',
          conversationId: conv.id,
        },
      });

      expect(result.sendConversationMessage).toEqual({
        id: expect.anything(),
        text: 'End to end message',
        sender: { id: blockedMemberId },
        created: expect.anything(),
        deleted: false,
        resolved: false,
      });
    }
  });

  it('successfully executes block request for the user', async () => {
    const response1 = await request(applicationUrl)
      .post('/conversation/block-user')
      .send({
        conversationIds: [conversation1.id, conversation2.id],
        memberId: blockedMemberId,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': applicationApiKey,
        Accept: 'application/json',
      });
    expect(response1.status).toEqual(201);
  });

  it('the blocked user can no longer send a message', async () => {
    for (const conv of [conversation1, conversation2]) {
      let result;
      try {
        result = await client.request(sendConversationMessageMutation, {
          messageDto: {
            text: 'Block user test',
            conversationId: conv.id,
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
    }
  });

  it('successfully executes unblock request for the user', async () => {
    const response = await request(applicationUrl)
      .post('/conversation/unblock-user')
      .send({
        conversationIds: [conversation1.id, conversation2.id],
        memberId: blockedMemberId,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': applicationApiKey,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(201);
  });

  it('Unblocked user can start sending messages again', async () => {
    for (const conv of [conversation1, conversation2]) {
      const result = await client.request(sendConversationMessageMutation, {
        messageDto: {
          text: 'End to end message',
          conversationId: conv.id,
        },
      });

      expect(result).toEqual({
        sendConversationMessage: {
          id: expect.anything(),
          text: 'End to end message',
          created: expect.anything(),
          sender: { id: blockedMemberId },
          deleted: false,
          resolved: false,
        },
      });
    }
  });

  it('Returns 400 if an invalid payload is provided', async () => {
    const response = await request(applicationUrl)
      .post('/conversation/unblock-user')
      .send({
        conversationIds: [conversation1.id, conversation2.id],
        // memberId missing
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': applicationApiKey,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(400);
  });
});
