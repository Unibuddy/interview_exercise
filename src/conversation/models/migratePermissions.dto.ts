import { ApiProperty } from '@nestjs/swagger';

import { Permission } from './Permission.dto';
import { Product } from './ContextSchema.dto';

export class MigratePermissionsDTO {
  @ApiProperty({
    required: true,
    description: 'Permissions Body',
  })
  permissions: Permission[];

  @ApiProperty({
    required: true,
    enum: ['community'],
    description: 'Target Product - community/virtualEvent',
  })
  product: Product;

  @ApiProperty({
    required: true,
    description: 'conversationIds list for those permission has to be updated',
  })
  conversationIds: string[];
}
