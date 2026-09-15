'use client';

import * as React from 'react';
import { ArrowLeft, CheckCheck, Inbox, Send, WifiOff } from 'lucide-react';
import {
  AdminTopbar,
  Pill,
  Segmented,
  adminUi as ui,
} from '../../../modules/admin-dashboard/components/admin-ui';
import { useAdminLiveChat } from '../../../modules/live-chat/components/admin-live-chat-provider';
import type { LiveChatConversation } from '../../../modules/live-chat/interfaces/live-chat';
import { cn, initials } from '../../../shared/lib/utils';
import styles from '../styles/admin-live-chat.module.css';

type Filter = 'OPEN' | 'CLOSED' | 'all';

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function preview(conversation: LiveChatConversation) {
  const last = conversation.lastMessage;
  if (!last) return 'No messages yet';
  return `${last.senderRole === 'ADMIN' ? 'You: ' : ''}${last.body}`;
}

export default function AdminLiveChatPage() {
  const chat = useAdminLiveChat();
  const { open } = chat;
  const [filter, setFilter] = React.useState<Filter>('OPEN');
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Relative times ("4m") would otherwise freeze at whatever they said on load.
  const [, setTick] = React.useState(0);

  const threadRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Leaving the page must stop treating a thread as "being read", or guest
  // messages would keep getting marked read while nobody is looking.
  React.useEffect(() => () => open(null), [open]);

  const active = chat.conversations.find((item) => item.id === chat.activeId) ?? null;
  const activeTyping = active ? chat.typing.has(active.id) : false;

  React.useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [chat.activeMessages, activeTyping]);

  React.useEffect(() => {
    setDraft('');
    setError(null);
    if (chat.activeId) inputRef.current?.focus();
  }, [chat.activeId]);

  const needle = search.trim().toLowerCase();
  const visible = chat.conversations.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (!needle) return true;
    return item.user.name.toLowerCase().includes(needle) || item.user.email.toLowerCase().includes(needle);
  });
  const openCount = chat.conversations.filter((item) => item.status === 'OPEN').length;

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending || !active) return;
    setSending(true);
    setError(null);
    const ack = await chat.send(body);
    setSending(false);
    if (ack.ok) {
      setDraft('');
      inputRef.current?.focus();
    } else {
      setError(ack.error);
    }
  };

  const closeActive = async () => {
    if (!active) return;
    if (!window.confirm(`Close the conversation with ${active.user.name}? Their next message will open a new one.`)) return;
    const ack = await chat.close(active.id);
    if (!ack.ok) setError(ack.error);
  };

  const ready = chat.connection === 'ready';

  return (
    <>
      <AdminTopbar
        title="Live chat"
        meta={`${openCount} open${chat.totalUnread ? ` · ${chat.totalUnread} unread` : ''}`}
      >
        {chat.connection === 'ready' ? (
          <Pill tone="success" dot>
            Connected
          </Pill>
        ) : chat.connection === 'unauthorized' ? (
          <Pill tone="danger" dot>
            Session expired
          </Pill>
        ) : (
          <Pill tone="warning" dot>
            {chat.connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          </Pill>
        )}
      </AdminTopbar>

      <div className={ui.body}>
        <div className={cn(styles.layout, active && styles.layoutThreadOpen)}>
          <aside className={styles.inbox}>
            <div className={styles.inboxTools}>
              <input
                type="search"
                className={ui.search}
                placeholder="Search guest name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search conversations"
              />
              <Segmented<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'OPEN', label: 'Open', count: openCount },
                  { value: 'CLOSED', label: 'Closed' },
                  { value: 'all', label: 'All' },
                ]}
              />
            </div>

            <ul className={styles.list}>
              {chat.connection === 'connecting' && chat.conversations.length === 0 ? (
                <li className={styles.listEmpty}>Loading conversations…</li>
              ) : visible.length === 0 ? (
                <li className={styles.listEmpty}>
                  {filter === 'OPEN' && !needle ? 'No open conversations. New guest messages appear here instantly.' : 'Nothing matches.'}
                </li>
              ) : (
                visible.map((item) => {
                  const selected = item.id === chat.activeId;
                  const typing = chat.typing.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(styles.row, selected && styles.rowSelected)}
                        onClick={() => open(item.id)}
                        aria-current={selected ? 'true' : undefined}
                      >
                        <span className={styles.avatar}>{initials(item.user.name)}</span>
                        <span className={styles.rowBody}>
                          <span className={styles.rowTop}>
                            <span className={cn(styles.rowName, item.adminUnread > 0 && styles.rowNameUnread)}>
                              {item.user.name}
                            </span>
                            <span className={styles.rowTime}>{timeAgo(item.lastMessageAt)}</span>
                          </span>
                          <span className={styles.rowBottom}>
                            <span className={cn(styles.rowPreview, typing && styles.rowTyping)}>
                              {typing ? 'typing…' : preview(item)}
                            </span>
                            {item.adminUnread > 0 ? (
                              <span className={styles.unread}>{item.adminUnread}</span>
                            ) : item.status === 'CLOSED' ? (
                              <span className={styles.closedTag}>Closed</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <section className={styles.thread}>
            {!active ? (
              <div className={styles.threadEmpty}>
                <Inbox className={styles.threadEmptyIcon} aria-hidden />
                <p className={styles.threadEmptyTitle}>Pick a conversation</p>
                <p className={styles.threadEmptyText}>
                  Guest messages arrive here in real time over a WebSocket — no refreshing needed.
                </p>
              </div>
            ) : (
              <>
                <header className={styles.threadHead}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => open(null)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className={styles.avatar}>{initials(active.user.name)}</span>
                  <div className={styles.threadWho}>
                    <p className={styles.threadName}>{active.user.name}</p>
                    <a className={styles.threadEmail} href={`mailto:${active.user.email}`}>
                      {active.user.email}
                    </a>
                  </div>
                  {active.status === 'OPEN' ? (
                    <button type="button" className={cn(ui.btn, ui.btnGhost)} onClick={closeActive}>
                      <CheckCheck className="h-4 w-4" /> Close
                    </button>
                  ) : (
                    <Pill tone="neutral">Closed</Pill>
                  )}
                </header>

                {chat.connection === 'reconnecting' ? (
                  <div className={styles.banner} role="status">
                    <WifiOff className="h-3.5 w-3.5" aria-hidden /> Connection lost — reconnecting. Messages
                    will sync when it is back.
                  </div>
                ) : null}

                <div className={styles.messages} ref={threadRef} role="log" aria-live="polite">
                  {chat.loadingThread && chat.activeMessages.length === 0 ? (
                    <p className={styles.threadHint}>Loading messages…</p>
                  ) : null}

                  {chat.activeMessages.map((message) => {
                    const staff = message.senderRole === 'ADMIN';
                    return (
                      <div key={message.id} className={cn(styles.message, staff && styles.messageStaff)}>
                        <div className={cn(styles.bubble, staff ? styles.bubbleStaff : styles.bubbleGuest)}>
                          {message.body}
                        </div>
                        <span className={styles.meta}>
                          {staff ? message.senderName : active.user.name.split(' ')[0]} · {clock(message.createdAt)}
                        </span>
                      </div>
                    );
                  })}

                  {activeTyping ? <p className={styles.typingHint}>{active.user.name.split(' ')[0]} is typing…</p> : null}

                  {active.status === 'CLOSED' ? (
                    <p className={styles.threadHint}>
                      This conversation is closed. If the guest writes again, it opens as a new conversation.
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                ) : null}

                <form
                  className={styles.composer}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <textarea
                    ref={inputRef}
                    className={cn(ui.textarea, styles.composerInput)}
                    rows={2}
                    maxLength={2000}
                    value={draft}
                    disabled={!ready || active.status === 'CLOSED'}
                    placeholder={
                      active.status === 'CLOSED'
                        ? 'Closed — the guest can start a new conversation'
                        : `Reply to ${active.user.name.split(' ')[0]}… (Enter to send, Shift+Enter for a new line)`
                    }
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (event.target.value.trim()) chat.notifyTyping();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                    aria-label="Reply"
                  />
                  <button
                    type="submit"
                    className={cn(ui.btn, ui.btnPrimary)}
                    disabled={!ready || !draft.trim() || sending || active.status === 'CLOSED'}
                  >
                    <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
