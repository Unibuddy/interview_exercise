import request from 'supertest';
const applicationUrl = process.env.APP_URL;

describe('Health', () => {
  it('/ (GET)', () => {
    return request(applicationUrl).get('/health').expect(200);
  });
});
