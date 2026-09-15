'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { liveChatSocketTarget } from '../../../shared/lib/socket-target';
import {
  upsertMessage,
  type LiveChatAck,
  type LiveChatConnection,
  type LiveChatConversation,
  type LiveChatMessage,
} from '../interfaces/live-chat';

const ACK_TIMEOUT_MS = 8_000;
const TYPING_VISIBLE_MS = 3_000;
const TYPING_THROTTLE_MS = 2_000;

interface AdminLiveChat {
  connection: LiveChatConnection;
  conversations: LiveChatConversation[];
  /** Sum of unread guest messages across open threads — the sidebar badge. */
  totalUnread: number;
  activeId: string | null;
  activeMessages: LiveChatMessage[];
  loadingThread: boolean;
  /** Conversation ids whose guest is typing right now. */
  typing: Set<string>;
  open: (conversationId: string | null) => void;
  send: (body: string) => Promise<LiveChatAck<LiveChatMessage>>;
  close: (conversationId: string) => Promise<LiveChatAck<void>>;
  notifyTyping: () => void;
}

const Context = React.createContext<AdminLiveChat | null>(null);

export function useAdminLiveChat(): AdminLiveChat {
  const value = React.useContext(Context);
  if (!value) throw new Error('useAdminLiveChat must be used inside AdminLiveChatProvider');
  return value;
}

/** Newest activity first, open threads above closed ones — the order staff work through. */
function sortInbox(list: LiveChatConversation[]) {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'OPEN' ? -1 : 1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });
}

/**
 * One staff WebSocket for the whole admin portal.
 *
 * Mounted in the admin shell rather than on the live-chat page, so a guest
 * message raises the sidebar badge on whatever screen staff happen to be on,
 * and opening the inbox does not have to wait for a fresh handshake.
 */
export function AdminLiveChatProvider({ children }: { children: React.ReactNode }) {
  const socketRef = React.useRef<Socket | null>(null);
  const activeRef = React.useRef<string | null>(null);
  const typingTimers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastTypingSent = React.useRef(0);

  const [connection, setConnection] = React.useState<LiveChatConnection>('connecting');
  const [conversations, setConversations] = React.useState<LiveChatConversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeMessages, setActiveMessages] = React.useState<LiveChatMessage[]>([]);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [typing, setTyping] = React.useState<Set<string>>(new Set());

  const loadThread = React.useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    setLoadingThread(true);
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('admin:open', { conversationId })
      .then((ack: LiveChatAck<{ messages: LiveChatMessage[] }>) => {
        // Staff may have clicked another thread while this one loaded.
        if (activeRef.current !== conversationId) return;
        if (ack.ok) setActiveMessages(ack.data.messages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (activeRef.current === conversationId) setLoadingThread(false);
      });
  }, []);

  React.useEffect(() => {
    const { origin, path } = liveChatSocketTarget('admin');
    const socket = io(origin, {
      path,
      transports: ['websocket'],
      withCredentials: true,
      reconnectionDelayMax: 10_000,
    });
    socketRef.current = socket;

    // Sent after every (re)connection: reload everything that might have
    // changed while the connection was down.
    socket.on('admin:ready', () => {
      socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck('admin:inbox')
        .then((ack: LiveChatAck<LiveChatConversation[]>) => {
          if (ack.ok) setConversations(sortInbox(ack.data));
          setConnection('ready');
          if (activeRef.current) loadThread(activeRef.current);
        })
        .catch(() => setConnection('reconnecting'));
    });

    socket.on(
      'admin:conversation',
      ({ conversation, message }: { conversation: LiveChatConversation; message: LiveChatMessage | null }) => {
        setConversations((previous) =>
          sortInbox([conversation, ...previous.filter((item) => item.id !== conversation.id)]),
        );

        if (message && message.conversationId === activeRef.current) {
          setActiveMessages((previous) => upsertMessage(previous, message));
          // Staff are looking at this thread, so the guest's message is read
          // the moment it lands. Re-opening clears the counter server-side
          // and broadcasts that to other staff; it only fires while unread is
          // non-zero, so it cannot loop.
          if (message.senderRole === 'USER' && conversation.adminUnread > 0) {
            loadThread(message.conversationId);
          }
        }

        if (message?.senderRole === 'USER') {
          setTyping((previous) => {
            if (!previous.has(conversation.id)) return previous;
            const next = new Set(previous);
            next.delete(conversation.id);
            return next;
          });
        }
      },
    );

    socket.on('admin:typing', ({ conversationId }: { conversationId: string }) => {
      setTyping((previous) => (previous.has(conversationId) ? previous : new Set(previous).add(conversationId)));
      const timers = typingTimers.current;
      const existing = timers.get(conversationId);
      if (existing) clearTimeout(existing);
      timers.set(
        conversationId,
        setTimeout(() => {
          timers.delete(conversationId);
          setTyping((previous) => {
            const next = new Set(previous);
            next.delete(conversationId);
            return next;
          });
        }, TYPING_VISIBLE_MS),
      );
    });

    socket.on('chat:unauthorized', () => setConnection('unauthorized'));
    socket.on('disconnect', (reason) => {
      setConnection((current) =>
        current === 'unauthorized' || reason === 'io client disconnect' ? current : 'reconnecting',
      );
    });
    socket.on('connect_error', () => {
      setConnection((current) => (current === 'unauthorized' ? current : 'reconnecting'));
    });

    const timers = typingTimers.current;
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [loadThread]);

  const open = React.useCallback(
    (conversationId: string | null) => {
      activeRef.current = conversationId;
      setActiveId(conversationId);
      setActiveMessages([]);
      if (conversationId) loadThread(conversationId);
      else setLoadingThread(false);
    },
    [loadThread],
  );

  const send = React.useCallback(async (body: string): Promise<LiveChatAck<LiveChatMessage>> => {
    const socket = socketRef.current;
    const conversationId = activeRef.current;
    if (!socket?.connected || !conversationId) return { ok: false, error: 'Not connected — reconnecting…' };
    try {
      const ack: LiveChatAck<LiveChatMessage> = await socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck('admin:send', { conversationId, body });
      if (ack.ok && activeRef.current === conversationId) {
        setActiveMessages((previous) => upsertMessage(previous, ack.data));
      }
      return ack;
    } catch {
      return { ok: false, error: 'The reply did not go through. Try again.' };
    }
  }, []);

  const close = React.useCallback(async (conversationId: string): Promise<LiveChatAck<void>> => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Not connected — reconnecting…' };
    try {
      return await socket.timeout(ACK_TIMEOUT_MS).emitWithAck('admin:close', { conversationId });
    } catch {
      return { ok: false, error: 'Could not close the conversation. Try again.' };
    }
  }, []);

  const notifyTyping = React.useCallback(() => {
    const now = Date.now();
    const conversationId = activeRef.current;
    if (!conversationId || now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    socketRef.current?.emit('admin:typing', { conversationId }, () => undefined);
  }, []);

  const totalUnread = React.useMemo(
    () => conversations.reduce((sum, item) => sum + (item.status === 'OPEN' ? item.adminUnread : 0), 0),
    [conversations],
  );

  const value = React.useMemo<AdminLiveChat>(
    () => ({
      connection,
      conversations,
      totalUnread,
      activeId,
      activeMessages,
      loadingThread,
      typing,
      open,
      send,
      close,
      notifyTyping,
    }),
    [connection, conversations, totalUnread, activeId, activeMessages, loadingThread, typing, open, send, close, notifyTyping],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
