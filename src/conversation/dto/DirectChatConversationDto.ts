import { Context } from './../models/ContextSchema.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../models/ContextSchema.dto';

export class DirectChatConversationDto {
  @ApiProperty()
  product: Product;

  @ApiProperty({ type: [Context] })
  context: Context[];

  @ApiProperty({ type: String, required: true })
  userToConverseWith: string;

  @ApiProperty({ type: String, required: true })
  currentUserId: string;
}
