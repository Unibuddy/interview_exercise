import { ApiProperty } from '@nestjs/swagger';

export type UnreadCountOutput = { id: string; unreadMessageCount: number };

export class UnreadCountInput {
  @ApiProperty({
    required: true,
    description: 'Id of the user for whom unread message count is requested',
  })
  userId: string;

  @ApiProperty({
    description:
      'List of conversationIds for whom the unread count is to be computed',
  })
  conversationIds?: string[];
}
