import { Module } from '@nestjs/common';
import { ObjectIDScalar } from './objectId.scalar';

@Module({
  providers: [ObjectIDScalar],
})
export class ScalarsModule {}
