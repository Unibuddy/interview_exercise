import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Injectable } from '@nestjs/common';
import { ObjectID } from 'mongodb';
import { ConfigurationManager } from '../configuration/configuration-manager';

export interface IUBJwt {
  identity: {
    user_id: string;
    account_role: string;
    university_id?: string;
    marketplace_id?: string;
  };
}

export interface IAuthenticatedUser {
  userId: ObjectID;
  accountRole: string;
  universityId?: ObjectID;
  marketplaceId?: ObjectID;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configManager: ConfigurationManager) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
      ignoreExpiration: false,
      secretOrKey: configManager.getConfiguration().auth.jwtSecret,
    });
  }

  async validate(payload: IUBJwt): Promise<IAuthenticatedUser> {
    const { identity } = payload;
    console.log({identity})
    return {
      userId: new ObjectID(identity.user_id),
      accountRole: identity.account_role,
      universityId: identity.university_id
        ? new ObjectID(identity.university_id)
        : undefined,
      marketplaceId: identity.marketplace_id
        ? new ObjectID(identity.marketplace_id)
        : undefined,
    };
  }
}

export const AuthenticatedUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): IAuthenticatedUser => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
