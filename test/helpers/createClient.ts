import { GraphQLClient } from 'graphql-request';
import { JwtService } from '@nestjs/jwt';
import { IUBJwt } from '../../src/authentication/jwt.strategy';

const jwtService = new JwtService({ secret: process.env.JWT_SECRET_KEY });
const applicationUrl = process.env.APP_URL;

export const createClient = (tokenContent?: IUBJwt) => {
  const client = new GraphQLClient(`${applicationUrl}/graphql`);

  if (tokenContent) {
    const signed = jwtService.sign(tokenContent);
    client.setHeader('authorization', `JWT ${signed}`);
  }

  return client;
};
