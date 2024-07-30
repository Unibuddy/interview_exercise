import { Injectable, Scope } from '@nestjs/common';
import { ILoader, Loader } from '../utils/loader';
import { MessageLogic } from './message.logic';
import { ChatMessage } from './models/message.entity';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IChatMessageDataLoader extends ILoader<ChatMessage> {}

@Injectable({ scope: Scope.REQUEST })
export class ChatMessageDataLoader
  extends Loader<ChatMessage>
  implements IChatMessageDataLoader
{
  constructor(messageLogic: MessageLogic) {
    super(messageLogic, {
      text: 'Error displaying message',
      sender: { id: '' },
      likes: [],
      likesCount: 0,
      created: new Date(),
      deleted: false,
      resolved: false,
    });
  }
}
