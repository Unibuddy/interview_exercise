import { INestApplication } from '@nestjs/common';

import { Test, TestingModule } from '@nestjs/testing';

import { JwtService } from '@nestjs/jwt';

import supertest from 'supertest';

import { IUBJwt } from './jwt.strategy';
import { AppModule, MockActor } from './mock-server-with-auth';
import { ObjectID } from 'mongodb';
import { getLocalConfig } from '../configuration/configuration-manager.utils';

const normalMutation = `
  mutation MyMutation {
    createBook {id}
  }
`;
const guardedMutation = `
  mutation MyMutation {
    guardedCreateBook {id}
  }
`;

const bookWithUserMutation = `
  mutation MyMutation {
    bookWithUser {id}
  }
`;

const jwtService = new JwtService({ secret: getLocalConfig().auth.jwtSecret });

describe('auth test', () => {
  let app: INestApplication;
  let mockActor: MockActor;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    mockActor = module.get<MockActor>(MockActor);
    app = module.createNestApplication();
    await app.init();
  });

  it('works with no guards and no header', async () => {
    await supertest(app.getHttpServer())
      .post('/graphql')
      .send({ query: normalMutation })
      .expect(200)
      .expect(`{"data":{"createBook":{"id":"123"}}}\n`);
  });

  it('returns the book if jwt', async () => {
    const toSign: IUBJwt = {
      identity: {
        account_role: 'admin',
        user_id: '597cfa3ac88c22000a74d169',
        university_id: '597cfa3ac88c22000a74d169',
      },
    };
    const signed = jwtService.sign(toSign);
    await supertest(app.getHttpServer())
      .post('/graphql')
      .set({ authorization: `JWT ${signed}` })
      .send({ query: guardedMutation })
      .expect(200)
      .expect(`{"data":{"guardedCreateBook":{"id":"123"}}}\n`);
  });

  it('passes down the current user', async () => {
    const spy = jest.spyOn(mockActor, 'action');

    const toSign: IUBJwt = {
      identity: {
        account_role: 'admin',
        user_id: '597cfa3ac88c22000a74d167',
        university_id: '597cfa3ac88c22000a74d169',
        marketplace_id: '597cfa3ac88c22000a74d168',
      },
    };
    const signed = jwtService.sign(toSign);
    await supertest(app.getHttpServer())
      .post('/graphql')
      .set({ authorization: `JWT ${signed}` })
      .send({ query: bookWithUserMutation })
      .expect(200)
      .expect(`{"data":{"bookWithUser":{"id":"123"}}}\n`);
    expect(spy).toHaveBeenCalledWith({
      accountRole: 'admin',
      marketplaceId: new ObjectID('597cfa3ac88c22000a74d168'),
      universityId: new ObjectID('597cfa3ac88c22000a74d169'),
      userId: new ObjectID('597cfa3ac88c22000a74d167'),
    });
  });

  it('passes down the current user even if no uni id or no marketplace id', async () => {
    const spy = jest.spyOn(mockActor, 'action');

    const toSign: IUBJwt = {
      identity: {
        account_role: 'admin',
        user_id: '597cfa3ac88c22000a74d167',
      },
    };
    const signed = jwtService.sign(toSign);
    await supertest(app.getHttpServer())
      .post('/graphql')
      .set({ authorization: `JWT ${signed}` })
      .send({ query: bookWithUserMutation })
      .expect(200)
      .expect(`{"data":{"bookWithUser":{"id":"123"}}}\n`);
    expect(spy).toHaveBeenCalledWith({
      accountRole: 'admin',
      userId: new ObjectID('597cfa3ac88c22000a74d167'),
    });
  });

  it('returns error 401 if no jwt', async () => {
    await supertest(app.getHttpServer())
      .post('/graphql')
      .send({ query: guardedMutation })
      .expect(200)
      .expect(
        `{"errors":[{"message":"UNAUTHENTICATED","locations":[{"line":3,"column":5}],"path":["guardedCreateBook"],"extensions":{"code":"UNAUTHENTICATED"}}],"data":null}\n`,
      );
  });

  it('returns error 401 jwt expired', async () => {
    const toSign: IUBJwt = {
      identity: {
        account_role: 'admin',
        user_id: '597cfa3ac88c22000a74d169',
        university_id: '597cfa3ac88c22000a74d169',
      },
    };
    const expired = jwtService.sign(toSign, { expiresIn: '1ms' });
    setTimeout(async () => {
      await supertest(app.getHttpServer())
        .post('/graphql')
        .send({ query: guardedMutation })
        .set({ authorization: `JWT ${expired}` })
        .expect(200)
        .expect(
          `{"errors":[{"message":"UNAUTHENTICATED","locations":[{"line":3,"column":5}],"path":["guardedCreateBook"],"extensions":{"code":"UNAUTHENTICATED"}}],"data":null}\n`,
        );
    }, 10);
  });
});
