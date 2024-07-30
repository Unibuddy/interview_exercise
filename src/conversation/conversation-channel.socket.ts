import { Injectable } from '@nestjs/common';
import {
  BaseEventType,
  Channel,
  SocketsService,
} from '../sockets/sockets.service';
import { SocketChatMessage } from '../message/models/message.entity';
import { ObjectId } from 'mongodb';
import { User } from '../user/models/user.model';

export class SendMessageEvent implements BaseEventType {
  public name = 'send-message';
  constructor(public message: SocketChatMessage) {}
}
export class DeleteMessageEvent implements BaseEventType {
  public name = 'delete-message';
  constructor(public message: { id: ObjectId }) {}
}
export class LikeMessageEvent implements BaseEventType {
  public name = 'like-message';
  constructor(public message: { userId: ObjectId; messageId: ObjectId }) {}
}
export class UnlikeMessageEvent implements BaseEventType {
  public name = 'unlike-message';
  constructor(public message: { userId: ObjectId; messageId: ObjectId }) {}
}

export class ReactedMessageEvent implements BaseEventType {
  public name = 'reacted-message';
  constructor(
    public message: {
      userId: ObjectId;
      messageId: ObjectId;
      reaction: string;
      reactionUnicode: string;
    },
  ) {}
}

export class UnReactedMessageEvent implements BaseEventType {
  public name = 'unreacted-message';
  constructor(
    public message: {
      userId: ObjectId;
      messageId: ObjectId;
      reaction: string;
      reactionUnicode: string;
    },
  ) {}
}

export class ResolveMessageEvent implements BaseEventType {
  public name = 'resolve-message';
  constructor(public message: { id: ObjectId }) {}
}

export class UnresolveMessageEvent implements BaseEventType {
  public name = 'unresolve-message';
  constructor(public message: { id: ObjectId }) {}
}

export class PinMessageEvent implements BaseEventType {
  public name = 'pin-message';
  constructor(public message: { id: ObjectId; message: SocketChatMessage }) {}
}

export class UnpinMessageEvent implements BaseEventType {
  public name = 'unpin-message';
  constructor(public message: { id: ObjectId }) {}
}

export class UserLeftConversationEvent implements BaseEventType {
  public name = 'user-left-conversation';
  constructor(public message: User) {}
}

export class UserJoinedConversationEvent implements BaseEventType {
  public name = 'user-joined-conversation';
  constructor(public message: User) {}
}

type EventType =
  | SendMessageEvent
  | DeleteMessageEvent
  | LikeMessageEvent
  | UnlikeMessageEvent
  | PinMessageEvent
  | UnpinMessageEvent
  | UserLeftConversationEvent
  | UserJoinedConversationEvent;

@Injectable()
export class ConversationChannel extends Channel<EventType> {
  constructor(protected socketClient: SocketsService) {
    super('conversation', true, socketClient);
  }
}
