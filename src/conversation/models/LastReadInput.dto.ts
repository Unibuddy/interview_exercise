import { ObjectID } from 'mongodb';
import { IAuthenticatedUser } from '../../authentication/jwt.strategy';

export type LastReadInput = {
  conversationId: string;
  authenticatedUser: IAuthenticatedUser;
  messageId: ObjectID;
};
