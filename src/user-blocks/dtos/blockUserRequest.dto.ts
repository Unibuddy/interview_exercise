import { ApiProperty } from '@nestjs/swagger';

export class BlockUserRequestDTO {
  @ApiProperty({
    required: true,
    description: 'Id of user which is blocked',
  })
  blocked_user: string;

  @ApiProperty({
    required: true,
    description: 'Id of target user against which user is blocked',
  })
  blocker: string; // can be user_id

  @ApiProperty({
    required: true,
    description: 'Event action type. True means block, false means unblock',
  })
  set_blocked: boolean; // true => blocked, false => unblocked

  @ApiProperty({
    required: true,
    enum: ['user'],
    description: 'Entity whose access is blocked. Can be user only',
  })
  blocker_type: 'user';
}
