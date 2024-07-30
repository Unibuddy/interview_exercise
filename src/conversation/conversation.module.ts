import { ConfigService } from '@nestjs/config';
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConversationResolver } from './conversation.resolver';
import { ConversationLogic } from './conversation.logic';
import { ConversationController } from './conversation.controller';
import {
  ChatConversationModel,
  ChatConversationSchema,
} from './models/conversation.model';
import { LastReadModel, LastReadSchema } from './models/lastRead.model';
import { ConversationData } from './conversation.data';
import { PermissionsModule } from '../permissions/permissions.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { MessageModule } from '../message/message.module';
import { ConversationMigrationLogic } from '../migrations/conversation/conversation.migration.logic';
import { ConversationMigrationData } from '../migrations/conversation/conversation.migration.data';
import { ConversationChannel } from './conversation-channel.socket';
import { SafeguardingModule } from '../safeguarding/safeguarding.module';
import { UserModule } from '../user/user.module';
import { SocketsModule } from '../sockets/sockets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatConversationModel.name, schema: ChatConversationSchema },
      { name: LastReadModel.name, schema: LastReadSchema },
    ]),
    forwardRef(() => PermissionsModule),
    forwardRef(() => MessageModule),
    CacheManagerModule,
    ConfigService,
    SafeguardingModule,
    SocketsModule,
    UserModule,
  ],
  providers: [
    ConfigService,
    ConversationChannel,
    ConversationData,
    ConversationLogic,
    ConversationMigrationData,
    ConversationMigrationLogic,
    ConversationResolver,
  ],
  controllers: [ConversationController],
  exports: [ConversationChannel, ConversationData, ConversationLogic],
})
export class ConversationModule {}
