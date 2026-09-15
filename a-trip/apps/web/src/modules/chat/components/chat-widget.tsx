'use client';

import * as React from 'react';
import { MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useChatConfig, useSendChatMessage } from '../hooks/use-chat';
import { useTranslation } from '../../../shared/i18n/use-translation';
import { ApiError } from '../../../shared/lib/api-client';
import { cn } from '../../../shared/lib/utils';
import type { ChatTurn } from '../interfaces/chat';
import styles from '../styles/chat-widget.module.css';

const SUGGESTION_KEYS = [
  'ui.chat.suggestion.cities',
  'ui.chat.suggestion.price',
  'ui.chat.suggestion.booking',
];

/**
 * Floating assistant for the public site.
 *
 * Lives in the layout rather than on a page, so the transcript survives
 * navigation — a guest can ask about a hotel, open it, and come back to the
 * same thread. It renders nothing at all until the API confirms an assistant
 * is configured.
 */
export function ChatWidget() {
  const { t, locale, dir } = useTranslation();
  const config = useChatConfig();
  const send = useSendChatMessage();

  const [open, setOpen] = React.useState(false);
  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  /** The question a failed send was carrying, so Retry does not need it retyped. */
  const lastAsked = React.useRef<string | null>(null);

  // Pin to the newest message whenever the transcript or the pending state
  // changes — including while the "typing" row is showing.
  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns, send.isPending, open]);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const ask = (message: string) => {
    const question = message.trim();
    if (!question || send.isPending) return;

    lastAsked.current = question;
    setError(null);
    setDraft('');

    // The history sent up is the transcript *before* this question, which is
    // exactly what the server expects to prepend to it.
    const history = turns;
    setTurns([...history, { role: 'user', content: question }]);

    send.mutate(
      { message: question, history, locale },
      {
        onSuccess: (data) => {
          setTurns((previous) => [...previous, { role: 'assistant', content: data.reply }]);
          lastAsked.current = null;
        },
        onError: (cause) => {
          // Kept out of the transcript so Retry can re-send the same question
          // without a dead assistant turn sitting above it.
          setError(cause instanceof ApiError ? cause.message : t('ui.chat.error'));
        },
      },
    );
  };

  const retry = () => {
    const question = lastAsked.current;
    if (!question) return;
    // Drop the question that failed; ask() puts it straight back.
    setTurns((previous) => {
      const last = previous[previous.length - 1];
      return last?.role === 'user' ? previous.slice(0, -1) : previous;
    });
    setError(null);
    ask(question);
  };

  const reset = () => {
    setTurns([]);
    setError(null);
    lastAsked.current = null;
    inputRef.current?.focus();
  };

  // Nothing configured, or the check itself failed: no button, no dead end.
  if (!config.data?.configured) return null;

  return (
    <div className={styles.root} dir={dir}>
      {open ? (
        <section
          className={styles.panel}
          role="dialog"
          aria-label={t('ui.chat.title')}
          aria-modal="false"
        >
          <header className={styles.head}>
            <span className={styles.headIcon} aria-hidden>
              <Sparkles className={styles.headIconGlyph} />
            </span>
            <div className={styles.headText}>
              <p className={styles.headTitle}>{t('ui.chat.title')}</p>
              <p className={styles.headSubtitle}>{t('ui.chat.subtitle')}</p>
            </div>
            {turns.length > 0 ? (
              <button
                type="button"
                className={styles.headBtn}
                onClick={reset}
                aria-label={t('ui.chat.clear')}
                title={t('ui.chat.clear')}
              >
                <RotateCcw className={styles.headBtnGlyph} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className={styles.headBtn}
              onClick={() => setOpen(false)}
              aria-label={t('ui.chat.close')}
            >
              <X className={styles.headBtnGlyph} aria-hidden />
            </button>
          </header>

          <div className={styles.list} ref={listRef} role="log" aria-live="polite">
            <div className={cn(styles.bubble, styles.bubbleAssistant)}>{t('ui.chat.greeting')}</div>

            {turns.map((turn, index) => (
              <div
                key={index}
                className={cn(
                  styles.bubble,
                  turn.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                )}
              >
                {turn.content}
              </div>
            ))}

            {send.isPending ? (
              <div className={cn(styles.bubble, styles.bubbleAssistant, styles.typing)}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className="sr-only">{t('ui.chat.thinking')}</span>
              </div>
            ) : null}

            {error ? (
              <div className={styles.error} role="alert">
                <span>{error}</span>
                {lastAsked.current ? (
                  <button type="button" className={styles.retryBtn} onClick={retry}>
                    {t('ui.chat.retry')}
                  </button>
                ) : null}
              </div>
            ) : null}

            {turns.length === 0 && !send.isPending ? (
              <div className={styles.suggestions}>
                {SUGGESTION_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => ask(t(key))}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
          >
            <textarea
              ref={inputRef}
              className={styles.input}
              rows={1}
              value={draft}
              maxLength={2000}
              placeholder={t('ui.chat.placeholder')}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter breaks the line — what every chat
                // box does, and the reason this is a textarea and not an input.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
              aria-label={t('ui.chat.placeholder')}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!draft.trim() || send.isPending}
              aria-label={t('ui.chat.send')}
            >
              <Send className={styles.sendGlyph} aria-hidden />
            </button>
          </form>

          <p className={styles.disclaimer}>{t('ui.chat.disclaimer')}</p>
        </section>
      ) : null}

      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? t('ui.chat.close') : t('ui.chat.open')}
      >
        {open ? (
          <X className={styles.launcherGlyph} aria-hidden />
        ) : (
          <MessageCircle className={styles.launcherGlyph} aria-hidden />
        )}
      </button>
    </div>
  );
}
