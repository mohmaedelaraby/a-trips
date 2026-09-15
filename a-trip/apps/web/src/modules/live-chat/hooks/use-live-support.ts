'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { liveChatSocketTarget } from '../../../shared/lib/socket-target';
import {
  upsertMessage,
  type LiveChatAck,
  type LiveChatConnection,
  type LiveChatMessage,
} from '../interfaces/live-chat';

const ACK_TIMEOUT_MS = 8_000;
/** How long "Omar is typing…" lingers after the last keystroke event. */
const TYPING_VISIBLE_MS = 3_000;
/** Minimum gap between typing events sent up — one per keystroke would flood staff. */
const TYPING_THROTTLE_MS = 2_000;

interface ThreadResponse {
  conversation: { id: string; userUnread: number } | null;
  messages: LiveChatMessage[];
}

export interface LiveSupport {
  connection: LiveChatConnection;
  messages: LiveChatMessage[];
  staffOnline: boolean;
  staffTyping: boolean;
  /** Staff replies not yet seen — drives the launcher badge. */
  unread: number;
  /** Staff closed the thread; the next message starts a new one. */
  closed: boolean;
  send: (body: string) => Promise<LiveChatAck<LiveChatMessage>>;
  markRead: () => void;
  notifyTyping: () => void;
}

/**
 * The guest's live-chat connection.
 *
 * Opened for as long as someone is signed in, not only while the panel is
 * open — otherwise a staff reply that arrives after the guest closes the
 * panel would never raise the badge that tells them to look.
 *
 * The socket authenticates with the httpOnly session cookie the browser
 * already holds; nothing token-shaped is handled here.
 */
export function useLiveSupport(userId: string | null): LiveSupport {
  const socketRef = React.useRef<Socket | null>(null);
  const conversationRef = React.useRef<string | null>(null);
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = React.useRef(0);

  const [connection, setConnection] = React.useState<LiveChatConnection>('idle');
  const [messages, setMessages] = React.useState<LiveChatMessage[]>([]);
  const [staffOnline, setStaffOnline] = React.useState(false);
  const [staffTyping, setStaffTyping] = React.useState(false);
  const [unread, setUnreadState] = React.useState(0);
  const unreadRef = React.useRef(0);
  const setUnread = React.useCallback((next: number | ((current: number) => number)) => {
    unreadRef.current = typeof next === 'function' ? next(unreadRef.current) : next;
    setUnreadState(unreadRef.current);
  }, []);
  const [closed, setClosed] = React.useState(false);

  React.useEffect(() => {
    if (!userId) {
      setConnection('idle');
      setMessages([]);
      setUnread(0);
      setClosed(false);
      conversationRef.current = null;
      return;
    }

    const { origin, path } = liveChatSocketTarget('user');
    const socket = io(origin, {
      path,
      // A real WebSocket from the first byte — no long-polling handshake.
      transports: ['websocket'],
      withCredentials: true,
      reconnectionDelayMax: 10_000,
    });
    socketRef.current = socket;
    setConnection('connecting');

    // Re-sent by the server after every (re)connection, so this is also how a
    // dropped connection catches up on anything it missed.
    socket.on('chat:ready', (payload: { staffOnline: boolean }) => {
      setStaffOnline(payload.staffOnline);
      socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck('chat:history')
        .then((ack: LiveChatAck<ThreadResponse>) => {
          if (!ack.ok) return;
          conversationRef.current = ack.data.conversation?.id ?? null;
          setMessages(ack.data.messages);
          setUnread(ack.data.conversation?.userUnread ?? 0);
          setClosed(false);
          setConnection('ready');
        })
        .catch(() => setConnection('reconnecting'));
    });

    socket.on('chat:message', (message: LiveChatMessage) => {
      // A message on a different thread means the old one was closed and this
      // is the first line of a new conversation.
      if (conversationRef.current !== message.conversationId) {
        conversationRef.current = message.conversationId;
        setMessages([message]);
      } else {
        setMessages((previous) => upsertMessage(previous, message));
      }
      setClosed(false);
      if (message.senderRole === 'ADMIN') {
        setUnread((count) => count + 1);
        setStaffTyping(false);
      }
    });

    socket.on('chat:typing', () => {
      setStaffTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setStaffTyping(false), TYPING_VISIBLE_MS);
    });

    socket.on('chat:presence', (payload: { staffOnline: boolean }) => setStaffOnline(payload.staffOnline));
    socket.on('chat:closed', () => setClosed(true));

    // Refused sessions are final: the server disconnects, and Socket.IO does
    // not retry a server-initiated disconnect, so there is no retry loop.
    socket.on('chat:unauthorized', () => setConnection('unauthorized'));
    socket.on('disconnect', (reason) => {
      setConnection((current) =>
        current === 'unauthorized' || reason === 'io client disconnect' ? current : 'reconnecting',
      );
    });
    socket.on('connect_error', () => {
      setConnection((current) => (current === 'unauthorized' ? current : 'reconnecting'));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [userId, setUnread]);

  const send = React.useCallback(async (body: string): Promise<LiveChatAck<LiveChatMessage>> => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Not connected — reconnecting…' };
    try {
      const ack: LiveChatAck<LiveChatMessage> = await socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck('chat:send', { body });
      if (ack.ok) {
        const message = ack.data;
        if (conversationRef.current !== message.conversationId) {
          conversationRef.current = message.conversationId;
          setMessages([message]);
        } else {
          setMessages((previous) => upsertMessage(previous, message));
        }
        setClosed(false);
      }
      return ack;
    } catch {
      return { ok: false, error: 'The message did not go through. Try again.' };
    }
  }, []);

  const markRead = React.useCallback(() => {
    if (unreadRef.current === 0) return;
    setUnread(0);
    socketRef.current?.emit('chat:read', () => undefined);
  }, [setUnread]);

  const notifyTyping = React.useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    socketRef.current?.emit('chat:typing', () => undefined);
  }, []);

  return { connection, messages, staffOnline, staffTyping, unread, closed, send, markRead, notifyTyping };
}
