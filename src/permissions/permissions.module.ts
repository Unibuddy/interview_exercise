import { forwardRef, Module } from '@nestjs/common';
import { MessageModule } from '../message/message.module';
import { ConversationModule } from '../conversation/conversation.module';
import { PermissionsService } from './permissions.service';
import { AbilityFactory } from './ability-factory';
import { UserBlocksModule } from '../user-blocks/user-blocks.module';
@Module({
  
  imports: [
    forwardRef(() => ConversationModule),
    forwardRef(() => MessageModule),
    UserBlocksModule,
  ],
  providers: [PermissionsService, AbilityFactory],
  exports: [PermissionsService],
})
export class PermissionsModule {}
