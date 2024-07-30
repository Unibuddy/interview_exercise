import { ApiProperty } from '@nestjs/swagger';

import { ChatMessage } from '../../message/models/message.entity';

export type LastMessageOutput = { id: string; lastMessage?: ChatMessage };

export class LastMessageInput {
  @ApiProperty({
    required: true,
    description: 'Id of the user for whom lastMessageId is requested',
  })
  userId: string;

  @ApiProperty({
    description:
      'List of conversationIds for whom the lastMessageId is to be computed',
  })
  conversationIds?: string[];
}
