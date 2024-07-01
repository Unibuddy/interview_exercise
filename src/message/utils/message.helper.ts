import { MessageDto } from '../models/message.dto';
import { ChatMessageDocument } from '../models/message.model';

export function isDateDifferenceWithin7Days(date1: string, date2: string) {
  const firstDate: any = new Date(date1);
  const secondDate: any = new Date(date2);

  const difference = Math.abs(firstDate - secondDate);

  const daysDifference = difference / (1000 * 60 * 60 * 24);

  return daysDifference <= 7;
}

export function createRichContent(
  data: MessageDto,
  chatMessage: ChatMessageDocument,
) {
  if (!data.richContent) return;

  if (data.richContent.reply?.id) {
    const { id } = data.richContent.reply;
    chatMessage.richContent = {
      reply: { id },
    };
  }

  if (data.richContent.giphy?.id) {
    const { id, type, height, width, aspectRatio } = data.richContent.giphy;

    const trimmedAspectRatio = Number(aspectRatio.toPrecision(3));

    chatMessage.richContent = {
      ...(chatMessage.richContent || {}),
      giphy: { id, type, height, width, aspectRatio: trimmedAspectRatio },
    };
  }

  if (data.richContent.images?.length) {
    chatMessage.richContent = {
      ...(chatMessage.richContent || {}),
      images: data.richContent.images,
    };
  }

  if (data.richContent.attachments?.length) {
    chatMessage.richContent = {
      ...(chatMessage.richContent || {}),
      attachments: data.richContent.attachments,
    };
  }

  if (data.richContent.poll) {
    chatMessage.richContent = {
      ...(chatMessage.richContent || {}),
      poll: data.richContent.poll,
    };
  }
}
