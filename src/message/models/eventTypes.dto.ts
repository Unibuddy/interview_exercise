import { Product } from '../../conversation/models/ContextSchema.dto';
import { AttachmentDto, PollDto } from './message.dto';

export type Envelope = {
  id: string;
  source: string;
  specversion: '1.1';
  type: string;
  datacontenttype: 'application/json';
  time: string;
  data: MessagePayload;
};

export type MessagePayload = {
  action: 'create' | 'update' | 'delete';
  universityId: string;
  productName: Product;
  conversationId: string;
  messageId: string;
  createdAt: string;
  messageText: string;
  senderId: string;
  senderRole?: string;
  giphyType?: 'gif' | 'sticker';
  imageCount?: number;
  attachments?: AttachmentDto[];
  poll?: PollDto;
};
