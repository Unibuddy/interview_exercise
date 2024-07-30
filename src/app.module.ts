import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { join } from 'path';
import { HealthModule } from './health/health.module';
import { ConversationModule } from './conversation/conversation.module';
import { ConversationInboxModule } from './conversation-inbox/conversation-inbox.module';
import { MessageModule } from './message/message.module';
import morgan from 'morgan';
import configuration from './configuration/configuration';
import { ScalarsModule } from './scalars/scalars.module';
import { GraphQLFederationModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config';
import { middleware } from 'express-openapi-validator';
import { ApiKeyStrategy } from './authentication/XApiKeyGuard';
import { ExceptionsLoggerFilter } from './exception/exception.handler';
import { PermissionsModule } from './permissions/permissions.module';
import { JwtStrategy } from './authentication/jwt.strategy';
import { SocketsModule } from './sockets/sockets.module';
import { UserModule } from './user/user.module';
import { CacheManagerModule } from './cache-manager/cache-manager.module';
import { ConfigManagerModule } from './configuration/configuration-manager.module';
import { SafeguardingModule } from './safeguarding/safeguarding.module';
import { ConfigurationManager } from './configuration/configuration-manager';
import { UserBlocksModule } from './user-blocks/user-blocks.module';

@Module({
  imports: [
    ConfigManagerModule,
    TerminusModule,
    HealthModule,
    MongooseModule.forRootAsync({
      imports: [ConfigManagerModule],
      inject: [ConfigurationManager],
      useFactory: (configurationManager: ConfigurationManager) => {
        const databaseConfig = configurationManager.getConfiguration().database;
        return {
          uri: databaseConfig.connectionString,
        };
      },
    }),
    ConversationModule,
    ConversationInboxModule,
    MessageModule,
    ScalarsModule,
    GraphQLFederationModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req }) => ({ req }),
      buildSchemaOptions: {
        numberScalarMode: 'integer',
      },
      introspection: true,
      fieldResolverEnhancers: ['guards'],
    }),
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      load: [configuration],
    }),
    PermissionsModule,
    SocketsModule,
    UserModule,
    CacheManagerModule,
    SafeguardingModule,
    UserBlocksModule,
  ],
  providers: [
    ApiKeyStrategy,
    {
      provide: APP_FILTER,
      useClass: ExceptionsLoggerFilter,
    },
    JwtStrategy,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(morgan('combined')).forRoutes('*');

    consumer
      .apply(
        ...middleware({
          apiSpec: `${process.cwd()}/openapi.json`,
          validateFormats: 'full',
          validateResponses: true,
        }),
      )
      .exclude('graphql')
      .forRoutes('*');
  }
}
