import { UseGuards, Module, Injectable } from '@nestjs/common';

import {
  Mutation,
  ObjectType,
  Resolver,
  Field,
  GraphQLFederationModule,
} from '@nestjs/graphql';

import { GqlAuthGuard } from './GqlAuthGuard';
import {
  JwtStrategy,
  AuthenticatedUser,
  IAuthenticatedUser,
} from './jwt.strategy';
import {
  ConfigurationManager,
  MockedConfigurationManager,
} from '../configuration/configuration-manager';

interface IAuthConfig {
  jwtSecret: string;
}

export const configuration = (): {
  auth: IAuthConfig;
} => ({
  auth: {
    jwtSecret: 'sshhhhhhhhhhhhhhh!',
  },
});

@ObjectType()
class Book {
  @Field()
  id: string;
}

@Injectable()
export class MockActor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  action(authUser: IAuthenticatedUser) {
    return { id: '123' };
  }
}

@Resolver(() => Book)
class MockResolver {
  constructor(private mockActor: MockActor) {}

  @Mutation(() => Book)
  async createBook(): Promise<Book> {
    return {
      id: '123',
    };
  }
  @Mutation(() => Book)
  @UseGuards(GqlAuthGuard)
  async guardedCreateBook(): Promise<Book> {
    return {
      id: '123',
    };
  }
  @Mutation(() => Book)
  @UseGuards(GqlAuthGuard)
  async bookWithUser(
    @AuthenticatedUser() authenticatedUser: IAuthenticatedUser,
  ): Promise<Book> {
    return this.mockActor.action(authenticatedUser);
  }
}

@Module({
  providers: [MockResolver, MockActor],
})
class BookModule {}

@Module({
  providers: [
    { provide: ConfigurationManager, useClass: MockedConfigurationManager },
  ],
  exports: [ConfigurationManager],
})
class ConfigManagerModule {}

@Module({
  imports: [
    BookModule,
    GraphQLFederationModule.forRoot({
      autoSchemaFile: true,
    }),
    ConfigManagerModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
