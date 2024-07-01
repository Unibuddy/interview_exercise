import { IAuthenticatedUser } from '../authentication/jwt.strategy';

export type ContextType = { req: { user: IAuthenticatedUser } };
export const getUserFromGqlContext = (context: ContextType) => context.req.user;
