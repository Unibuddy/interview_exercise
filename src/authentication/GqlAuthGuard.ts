import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticationError } from 'apollo-server-express';

@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') implements CanActivate {
  // we override this method because we need the extensions.code value to match in
  // the Apollo Gateway so that we're correctly throwing a 401
  // https://github.com/Unibuddy/apollo-gateway/blob/51cce2d8f010dce82dc3688211ecb0d3e621320e/index.js#L68
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let result;
    try {
      result = (await super.canActivate(context)) as boolean;
    } catch (e) {
      console.log(e)
      throw new AuthenticationError('UNAUTHENTICATED');
    }
    return Promise.resolve(result);
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

@Injectable()
export class GqlAuthGuardForReference extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    /*
     * A GqlExecutionContext typically expects 4 args in ExecutionContext.
     * However, in a @ResolveReference context, there are 3 args: `reference`, `context`, and `info`.
     * (See https://www.apollographql.com/docs/federation/api/apollo-federation/#parameters-1)
     *
     * This causes a problem, because GqlExecutionContext expects the first argument to be
     * the value of the `rootValue` function. (See https://www.apollographql.com/docs/apollo-server/data/resolvers/#resolver-arguments)
     *
     * So, in a hacky maneuver, we fix the args indices for the @ResolveReference scenario by shifting them one to the right.
     */
    if (context.getArgs().length < 4) {
      context.getArgs().splice(1, 0, {});
    }
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
