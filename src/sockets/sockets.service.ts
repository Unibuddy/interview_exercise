import Pusher from 'pusher';
import { Injectable } from '@nestjs/common';
import { ConfigurationManager } from '../configuration/configuration-manager';
import { IPusherConfig } from '../configuration/configuration';

export interface PusherTypes {
  channel: string;
  event: string;
  message: string;
}

export interface ISocketsService {
  send(data: PusherTypes): void;
  getFormattedName(channelName: string, isPrivate: boolean): string;
}

@Injectable()
export class SocketsService implements ISocketsService {
  pusherConfig: IPusherConfig;
  pusher: any;

  constructor(private configurationManager: ConfigurationManager) {
    this.pusherConfig = this.configurationManager.getConfiguration().pusher;
    this.pusher = new Pusher({
      appId: this.pusherConfig.appId,
      key: this.pusherConfig.key,
      secret: this.pusherConfig.secretKey,
      cluster: 'eu',
      useTLS: true,
    });
  }

  send(data: PusherTypes): void {
    if (this.pusherConfig.sendPusherMessages) {
      this.pusher.trigger(data.channel, data.event, data.message);
    }
  }

  getFormattedName(channelName: string, isPrivate = false): string {
    return isPrivate ? `private-${channelName}` : channelName;
  }
}

export interface BaseEventType {
  name: string;
  message: Record<any, any>;
}

export interface IChannel<EventType> {
  send(event: EventType, channelId: string): void;
}

export class Channel<EventType extends BaseEventType>
  implements IChannel<EventType>
{
  constructor(
    private name: string,
    private isPrivate = false,
    protected socketClient: SocketsService,
  ) {}

  private getName(channelId: string) {
    return `${this.socketClient.getFormattedName(
      this.name,
      this.isPrivate,
    )}-${channelId}`;
  }

  send(event: EventType, channelId: string): void {
    this.socketClient.send({
      channel: this.getName(channelId),
      event: event.name,
      message: JSON.stringify(event.message),
    });
  }
}
