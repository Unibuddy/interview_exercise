import { Module } from '@nestjs/common';
import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { UserService } from './user.service';

@Module({
  imports: [CacheManagerModule, ConfigManagerModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
