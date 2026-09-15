/** Mirrors LiveChatMessageDto on the API. */
export interface LiveChatMessage {
  id: string;
  conversationId: string;
  body: string;
  senderRole: 'USER' | 'ADMIN';
  /** Staff are signed by first name only. */
  senderName: string;
  createdAt: string;
}

/** Mirrors LiveChatConversationDto on the API — one row of the staff inbox. */
export interface LiveChatConversation {
  id: string;
  status: 'OPEN' | 'CLOSED';
  adminUnread: number;
  userUnread: number;
  lastMessageAt: string;
  user: { id: string; name: string; email: string };
  lastMessage: LiveChatMessage | null;
}

/** Every socket event answers through its acknowledgement in this shape. */
export type LiveChatAck<T> = { ok: true; data: T } | { ok: false; error: string };

export type LiveChatConnection =
  /** Not signed in on this side — nothing to connect with. */
  | 'idle'
  | 'connecting'
  | 'ready'
  /** Connection dropped; Socket.IO is retrying on its own. */
  | 'reconnecting'
  /** The server refused the session (expired, suspended, wrong role). No retry. */
  | 'unauthorized';

/** Inserts or replaces by id, keeping chronological order. Sender tabs get their own message twice: once as the event, once as the ack. */
export function upsertMessage(list: LiveChatMessage[], message: LiveChatMessage): LiveChatMessage[] {
  if (list.some((item) => item.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
