import { gql } from 'graphql-request';
import { isValidObjectId } from 'mongoose';
import request from 'supertest';
import { getLocalConfig } from '../src/configuration/configuration-manager.utils';
import { createClient } from './helpers/createClient';

const applicationUrl = process.env.APP_URL;
const API_KEY = getLocalConfig().auth.apiKeyForClients;

describe('Conversation', () => {
  it('/conversation (POST)', async () => {
    const response = await request(applicationUrl)
      .post('/conversation')
      .send({
        product: 'community',
        context: [],
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

  it('/conversation (POST) return 401 if no api key is provided', async () => {
    const response = await request(applicationUrl)
      .post('/conversation')
      .send({
        product: 'community',
        context: [],
      })
      .set('Content-Type', 'application/json')
      .set({
        Accept: 'application/json',
      });

    expect(response.status).toEqual(401);
  });

  it('/conversation (POST) return 400 if an invalid payload is provided', async () => {
    const response = await request(applicationUrl)
      .post('/conversation')
      .send({
        product: 1,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(400);
  });

  it('/conversation (POST) return 404 if an invalid payload is provided', async () => {
    const response = await request(applicationUrl)
      .post('/conversations')
      .send({
        product: 1,
      })
      .set('Content-Type', 'application/json')
      .set({
        'x-api-key': API_KEY,
        Accept: 'application/json',
      });

    expect(response.status).toEqual(404);
  });

  it('/graphql (POST) return 200 if a valid query is sent', async () => {
    const client = createClient();

    const result = await client.request(
      gql`
        {
          __schema {
            queryType {
              name
            }
          }
        }
      `,
    );
    expect(result).toEqual({ __schema: { queryType: { name: 'Query' } } });
  });
});
