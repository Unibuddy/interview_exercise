import { Directive, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Directive('@extends')
@Directive('@key(fields: "id")')
export class UserField {
  @Directive('@external')
  id?: string;
}

export class User extends UserField {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  profilePhoto?: string;

  accountRole?: string;
}

export type MessageSender = Omit<User, 'email' | 'lastName'>;
