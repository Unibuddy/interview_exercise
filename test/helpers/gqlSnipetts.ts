import { gql } from 'graphql-request';

export const sendConversationMessageMutation = gql`
  mutation ($messageDto: MessageDto!) {
    sendConversationMessage(messageDto: $messageDto) {
      id
      text
      created
      resolved
      sender {
        id
      }
      deleted
    }
  }
`;

export const getChatConversationMessages = gql`
  query ($getMessageDto: GetMessageDto!) {
    getChatConversationMessages(getMessageDto: $getMessageDto) {
      messages {
        id
        created
        text
        sender {
          id
        }
        deleted
        isSenderBlocked
      }
      hasMore
    }
  }
`;

export const deleteConversationMessage = gql`
  mutation ($deleteMessageDto: DeleteMessageDto!) {
    deleteConversationMessage(deleteMessageDto: $deleteMessageDto) {
      id
      text
      created
      deleted
      sender {
        id
      }
    }
  }
`;

export const recordLastMessageReadByUserMutation = gql`
  mutation ($markReadMessageDto: MarkReadMessageDTO!) {
    recordLastMessageReadByUser(markReadMessageDto: $markReadMessageDto) {
      conversationId
      messageId
      userId
    }
  }
`;

export const likeConversationMessage = gql`
  mutation ($likeMessageDto: LikeMessageDto!) {
    likeConversationMessage(likeMessageDto: $likeMessageDto) {
      id
      text
      created
      likes
      likesCount
      sender {
        id
      }
    }
  }
`;

export const unlikeConversationMessage = gql`
  mutation ($likeMessageDto: LikeMessageDto!) {
    unlikeConversationMessage(likeMessageDto: $likeMessageDto) {
      id
      text
      created
      likes
      likesCount
      sender {
        id
      }
    }
  }
`;

export const resolveConversationMessage = gql`
  mutation ($resolveMessageDto: ResolveMessageDto!) {
    resolveConversationMessage(resolveMessageDto: $resolveMessageDto) {
      id
      text
      resolved
      sender {
        id
      }
    }
  }
`;

export const unresolveConversationMessage = gql`
  mutation ($resolveMessageDto: ResolveMessageDto!) {
    unresolveConversationMessage(resolveMessageDto: $resolveMessageDto) {
      id
      text
      resolved
      sender {
        id
      }
    }
  }
`;

export const conversationInboxEntity = gql`
  query getInbox($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on ConversationInbox {
        conversations {
          id
        }
      }
    }
  }
`;
