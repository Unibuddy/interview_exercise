import { ApiProperty } from '@nestjs/swagger';
import { Prop } from '@nestjs/mongoose';
import {
  Action,
  Conditions,
  Subject,
} from '../../permissions/models/permissions.model';

export class Permission {
  @ApiProperty({
    enum: Action,
  })
  @Prop({
    required: true,
    enum: Action,
  })
  action: Action;

  @ApiProperty({
    enum: Subject,
  })
  @Prop({
    required: true,
    enum: Subject,
  })
  subject: Subject;

  @ApiProperty({
    required: false,
    type: Conditions,
  })
  @Prop({ type: Conditions, required: false })
  conditions?: Conditions;
}
