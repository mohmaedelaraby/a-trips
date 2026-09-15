'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, WifiOff } from 'lucide-react';
import { useTranslation } from '../../../shared/i18n/use-translation';
import { cn } from '../../../shared/lib/utils';
import type { LiveSupport } from '../hooks/use-live-support';
import styles from '../../chat/styles/chat-widget.module.css';

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * The "Our team" tab — a live conversation with staff over the guest's
 * WebSocket.
 *
 * Signed-in only: staff need to know who they are talking to, and it is what
 * keeps the inbox from filling with anonymous spam. A signed-out visitor gets
 * a sign-in link that brings them straight back here.
 */
export function LiveSupportPanel({
  live,
  active,
  signedIn,
}: {
  live: LiveSupport;
  active: boolean;
  signedIn: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const { markRead } = live;

  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [live.messages, live.staffTyping, active]);

  React.useEffect(() => {
    if (active && live.connection === 'ready') inputRef.current?.focus();
  }, [active, live.connection]);

  // Anything that arrives while the guest is looking at the thread is read by
  // definition — clear the badge and tell staff.
  React.useEffect(() => {
    if (active && live.unread > 0) markRead();
  }, [active, live.unread, markRead]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const ack = await live.send(body);
    setSending(false);
    if (ack.ok) {
      setDraft('');
      inputRef.current?.focus();
    } else {
      // The draft is kept, so a failed send never loses what they typed.
      setError(ack.error);
    }
  };

  if (!signedIn) {
    return (
      <div className={styles.panelBody} hidden={!active}>
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>{t('ui.liveChat.signInTitle')}</p>
          <p className={styles.noticeText}>{t('ui.liveChat.signInText')}</p>
          <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={styles.noticeAction}>
            {t('ui.common.signIn')}
          </Link>
        </div>
      </div>
    );
  }

  if (live.connection === 'unauthorized') {
    return (
      <div className={styles.panelBody} hidden={!active}>
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>{t('ui.liveChat.expiredTitle')}</p>
          <p className={styles.noticeText}>{t('ui.liveChat.expiredText')}</p>
          <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={styles.noticeAction}>
            {t('ui.common.signIn')}
          </Link>
        </div>
      </div>
    );
  }

  const ready = live.connection === 'ready';

  return (
    <div className={styles.panelBody} hidden={!active}>
      <div className={styles.presence}>
        <span className={cn(styles.presenceDot, live.staffOnline && styles.presenceDotOnline)} aria-hidden />
        {live.staffOnline ? t('ui.liveChat.staffOnline') : t('ui.liveChat.staffOffline')}
      </div>

      {live.connection === 'reconnecting' ? (
        <div className={styles.connectionBanner} role="status">
          <WifiOff className={styles.toolbarGlyph} aria-hidden />
          {t('ui.liveChat.reconnecting')}
        </div>
      ) : null}

      <div className={styles.list} ref={listRef} role="log" aria-live="polite">
        {live.connection === 'connecting' ? (
          <p className={styles.listHint}>{t('ui.liveChat.connecting')}</p>
        ) : null}

        {ready && live.messages.length === 0 ? (
          <div className={cn(styles.bubble, styles.bubbleAssistant)}>{t('ui.liveChat.intro')}</div>
        ) : null}

        {live.messages.map((message) => {
          const mine = message.senderRole === 'USER';
          return (
            <div key={message.id} className={cn(styles.messageRow, mine && styles.messageRowMine)}>
              <div className={cn(styles.bubble, mine ? styles.bubbleUser : styles.bubbleAssistant)}>
                {message.body}
              </div>
              <span className={styles.messageMeta}>
                {mine ? t('ui.liveChat.you') : message.senderName} · {timeLabel(message.createdAt)}
              </span>
            </div>
          );
        })}

        {live.staffTyping ? (
          <div className={cn(styles.bubble, styles.bubbleAssistant, styles.typing)}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className="sr-only">{t('ui.liveChat.staffTyping')}</span>
          </div>
        ) : null}

        {live.closed ? <p className={styles.listHint}>{t('ui.liveChat.closed')}</p> : null}

        {error ? (
          <div className={styles.error} role="alert">
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <textarea
          ref={inputRef}
          className={styles.input}
          rows={1}
          value={draft}
          maxLength={2000}
          disabled={!ready}
          placeholder={t('ui.liveChat.placeholder')}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value.trim()) live.notifyTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          aria-label={t('ui.liveChat.placeholder')}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!ready || !draft.trim() || sending}
          aria-label={t('ui.chat.send')}
        >
          <Send className={styles.sendGlyph} aria-hidden />
        </button>
      </form>
    </div>
  );
}
