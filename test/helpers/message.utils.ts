import { ObjectID } from 'mongodb';
import { GraphQLClient } from 'graphql-request';
import delay from 'delay';
import { RequestDocument } from 'graphql-request/dist/types';

/**
 * Helper function that creates ten messages for the purposes of
 * this test suite. It stores the ids in an array and we can then
 * configure the correct message id to set as the offset.
 */
export const createMessageDataForTest = async (
  conversationId: ObjectID,
  count: number,
  client: GraphQLClient,
  sendConversationMessageMutation: RequestDocument,
) => {
  const messageArray = [];
  let i = 0;
  for (i; i < count; i++) {
    const messageResult = await client.request(
      sendConversationMessageMutation,
      {
        messageDto: {
          text: `Message number ${i + 1}`,
          conversationId,
        },
      },
    );
    messageArray.push(messageResult.sendConversationMessage.id);
    delay(100);
  }
  return messageArray;
};
