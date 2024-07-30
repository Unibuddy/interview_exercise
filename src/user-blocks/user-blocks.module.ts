import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { ConversationModule } from '../conversation/conversation.module';
import { UserBlocksData } from './user-blocks.data';
import { UserBlocksLogic } from './user-blocks.logic';
import { UserBlockModel, UserBlockSchema } from './models/user-blocks.model';
import { UserBlocksController } from './user-blocks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserBlockModel.name, schema: UserBlockSchema },
    ]),
    ConfigManagerModule,
    forwardRef(() => ConversationModule),
  ],
  controllers: [UserBlocksController],
  providers: [
    ConfigService,
    UserBlocksData,
    UserBlocksLogic,
  ],
  exports: [UserBlocksLogic],
})
export class UserBlocksModule {}
