import { Module } from '@nestjs/common';
import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { SocketsService } from './sockets.service';

@Module({
  imports: [ConfigManagerModule],
  providers: [SocketsService],
  exports: [SocketsService],
})
export class SocketsModule {}
