import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export type MessageGroupedByConversationOutput = {
  _id: string;
  messages: { message: string; senderId: string }[];
  conversationId: string;
};

export class MessagesFilterInput {
  @ApiProperty({
    required: true,
    description:
      'List of conversationIds for whom the messages are to be fetched',
  })
  conversationIds: string[];

  @ApiProperty({
    description: 'start date for the messages to be filtered',
    required: false,
  })
  startDate: string;

  @ApiProperty({
    description: 'end date for the messages to be filtered',
    required: false,
  })
  @IsOptional()
  endDate: string;
}
