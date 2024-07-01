import { forwardRef, Module } from '@nestjs/common';
import {
  MessageResolver,
  RichMessageContentResolver,
} from './message.resolver';
import { MessageLogic } from './message.logic';
import { MessageData } from './message.data';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ChatMessageSchema, ChatMessageModel } from './models/message.model';
import { PermissionsModule } from '../permissions/permissions.module';
import { UserModule } from '../user/user.module';
import { ConversationModule } from '../conversation/conversation.module';
import { SafeguardingModule } from '../safeguarding/safeguarding.module';
import { ChatMessageDataLoader } from './message.dataloader';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessageModel.name, schema: ChatMessageSchema },
    ]),
    forwardRef(() => PermissionsModule),
    forwardRef(() => ConversationModule),
    UserModule,
    ConfigService,
    SafeguardingModule,
    UserBlocksModule,
  ],
  providers: [
    MessageResolver,
    RichMessageContentResolver,
    MessageLogic,
    MessageData,
    ConfigService,
    ChatMessageDataLoader,
  ],
  controllers: [],
  exports: [MessageData, MessageLogic, ChatMessageDataLoader],
})
export class MessageModule {}
