import {
  Delete,
  Param,
  Put,
  Get,
  Body,
  Query,
  Controller,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiSecurity, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpCode } from '@nestjs/common';

import { XApiKeyGuard } from '../authentication/XApiKeyGuard';
import { ConversationLogic } from './conversation.logic';
import { ConversationMigrationLogic } from '../migrations/conversation/conversation.migration.logic';
import { AddMemberDTO } from './models/AddMember.dto';
import { ChatConversation } from './models/ChatConversation.entity';
import {
  CreateChatConversationDto,
  Tag,
} from './models/CreateChatConversation.dto';
import { BlockUserDTO } from './models/blockUser.dto';
import { MigratePermissionsDTO } from './models/migratePermissions.dto';
import { UnreadCountInput, UnreadCountOutput } from './models/unreadCount.dto';
import { IMigrationsConfig } from '../configuration/configuration';
import { DirectChatConversationDto } from './dto/DirectChatConversationDto';
import {
  MessageGroupedByConversationOutput,
  MessagesFilterInput,
} from './models/messagesFilterInput';
import { isDateDifferenceWithin7Days } from '../message/utils/message.helper';
import { Response } from 'express';

@Controller('conversation')
export class ConversationController {
  constructor(
    private conversationLogic: ConversationLogic,
    private conversationMigrationLogic: ConversationMigrationLogic,
    private configService: ConfigService,
  ) {}

  @Post()
  @ApiSecurity('X-API-KEY')
  @UseGuards(XApiKeyGuard)
  async create(
    @Body() createChatConversationDto: CreateChatConversationDto,
  ): Promise<ChatConversation> {
    return this.conversationLogic.create(createChatConversationDto);
  }

  @Post('direct')
  @ApiSecurity('X-API-KEY')
  @UseGuards(XApiKeyGuard)
  async createDirectConversation(
    @Body() directChatConvDto: DirectChatConversationDto,
  ): Promise<ChatConversation> {
    return this.conversationLogic.createDirectChatConversation(
      directChatConvDto,
    );
  }

  @Put(':conversationId')
  @ApiSecurity('X-API-KEY')
  update(
    @Param('conversationId') conversationId: string,
    @Body() createChatConversationDto: CreateChatConversationDto,
  ) {
    throw new Error('Endpoint not implemented');
  }

  @Put(':conversationId/tags')
  @ApiSecurity('X-API-KEY')
  @UseGuards(XApiKeyGuard)
  @ApiBody({ type: [Tag] })
  async updateTags(
    @Param('conversationId') conversationId: string,
    @Body() tags: Tag[],
  ): Promise<ChatConversation> {
    return this.conversationLogic.updateTags(conversationId, tags);
  }

  @Post(':conversationId/member')
  @ApiSecurity('X-API-KEY')
  addMember(
    @Param('conversationId') conversationId: string,
    @Body() addMember: AddMemberDTO,
  ) {
    return this.conversationLogic.addMember(conversationId, addMember);
  }

  @Delete(':conversationId/member/:memberId')
  @ApiSecurity('X-API-KEY')
  deleteMember(
    @Param('conversationId') conversationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.conversationLogic.removeMember(conversationId, memberId);
  }

  @Post('block-user')
  @ApiSecurity('X-API-KEY')
  blockMember(@Body() blockUserDTO: BlockUserDTO) {
    const { conversationIds, memberId } = blockUserDTO;
    return this.conversationLogic.blockMember(conversationIds, memberId);
  }

  @Post('unblock-user')
  @ApiSecurity('X-API-KEY')
  unblockMember(@Body() blockUserDTO: BlockUserDTO) {
    const { conversationIds, memberId } = blockUserDTO;
    return this.conversationLogic.unblockMember(conversationIds, memberId);
  }

  @Post('migrate-permissions')
  @ApiResponse({
    status: 200,
    description: 'Migration of Permissions done successfully',
  })
  @ApiResponse({
    status: 501,
    description: 'Migrations are currently allowed only for community',
  })
  @ApiSecurity('X-API-KEY')
  @HttpCode(200)
  migratePermissions(@Body() migratePermissionsDto: MigratePermissionsDTO) {
    const { permissions, product, conversationIds } = migratePermissionsDto;
    return this.conversationLogic.migratePermissions(
      permissions,
      product,
      conversationIds,
    );
  }

  @Post('migrate-last-messages')
  @ApiResponse({
    status: 200,
    description: 'Migration of Last Messages done successfully',
  })
  @ApiSecurity('X-API-KEY')
  @HttpCode(200)
  migrateLastMessages() {
    if (
      this.configService.get<IMigrationsConfig>('migrations')?.allowMigrations
    ) {
      return this.conversationMigrationLogic.migrateLastMessagesForEveryConversation();
    } else {
      throw new Error('Migrations are not enabled');
    }
  }

  @Get('unread-message-count/:userId')
  @ApiSecurity('X-API-KEY')
  @HttpCode(200)
  async getUnreadMessageCounts(
    @Param('userId') userId: string,
    @Query('conversationIds') conversationIds: string[],
  ): Promise<UnreadCountOutput[]> {
    const unreadCountInput: UnreadCountInput = { userId, conversationIds };
    return this.conversationLogic.getUnreadMessageCounts(unreadCountInput);
  }

  @Get('messages')
  @ApiSecurity('X-API-KEY')
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @HttpCode(200)
  async getMessages(
    @Query('conversationIds') conversationIds: string[],
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageGroupedByConversationOutput[]> {
    const messagesFilterInput: MessagesFilterInput = {
      startDate,
      endDate,
      conversationIds,
    };
    if (!isDateDifferenceWithin7Days(startDate, endDate)) {
      res.status(403).send('Duration must be with in 7 days');
    }
    return await this.conversationLogic.getMessagesByConversation(
      messagesFilterInput,
    );
  }
}
