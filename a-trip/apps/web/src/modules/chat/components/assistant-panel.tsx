'use client';

import * as React from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { useSendChatMessage } from '../hooks/use-chat';
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
 * The AI assistant tab.
 *
 * Stays mounted while hidden — switching to the team tab, or closing the
 * panel, must not throw away the transcript.
 */
export function AssistantPanel({ active }: { active: boolean }) {
  const { t, locale } = useTranslation();
  const send = useSendChatMessage();

  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  /** The question a failed send was carrying, so Retry does not need it retyped. */
  const lastAsked = React.useRef<string | null>(null);

  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns, send.isPending, active]);

  React.useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

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

  return (
    <div className={styles.panelBody} hidden={!active}>
      <div className={styles.list} ref={listRef} role="log" aria-live="polite">
        <div className={cn(styles.bubble, styles.bubbleAssistant)}>{t('ui.chat.greeting')}</div>

        {turns.map((turn, index) => (
          <div
            key={index}
            className={cn(styles.bubble, turn.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant)}
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
              <button key={key} type="button" className={styles.suggestion} onClick={() => ask(t(key))}>
                {t(key)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {turns.length > 0 ? (
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolbarBtn} onClick={reset}>
            <RotateCcw className={styles.toolbarGlyph} aria-hidden />
            {t('ui.chat.clear')}
          </button>
        </div>
      ) : null}

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
            // Enter sends, Shift+Enter breaks the line.
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
    </div>
  );
}
