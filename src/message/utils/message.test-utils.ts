import { ObjectID } from 'mongodb';
import { MessageData } from '../message.data';

/**
 * Helper function that creates x {count} messages for the purposes of
 * this test suite. It stores the ids in an array and we can then
 * configure the correct message id to set as the offset.
 */
export async function createMessageDataForTest(
  conversationId: ObjectID,
  messageArray: ObjectID[],
  count: number,
  messageData: MessageData,
  senderId: ObjectID,
) {
  let i = 0;
  for (i; i < count; i++) {
    const message = await messageData.create(
      { conversationId, text: `Message ${i + 1}` },
      senderId,
    );
    messageArray.push(message.id);
  }
  return messageArray;
}
