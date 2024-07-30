import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDTO {
  @ApiProperty({
    required: true,
    description: 'Ids of the conversations user has joined',
  })
  conversationIds: string[];

  @ApiProperty({
    required: true,
    description: 'Id of the user',
  })
  memberId: string; // can be university_id or user_id
}
