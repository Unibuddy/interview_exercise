import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDTO {
  @ApiProperty({
    required: true,
    additionalProperties: false,
  })
  userId: string;
}
