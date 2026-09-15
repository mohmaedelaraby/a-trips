'use client';

import * as React from 'react';
import { Headset, MessageCircle, Sparkles, X } from 'lucide-react';
import { useChatConfig } from '../hooks/use-chat';
import { useSession } from '../../auth/hooks/use-auth';
import { useLiveSupport } from '../../live-chat/hooks/use-live-support';
import { LiveSupportPanel } from '../../live-chat/components/live-support-panel';
import { AssistantPanel } from './assistant-panel';
import { useTranslation } from '../../../shared/i18n/use-translation';
import { cn } from '../../../shared/lib/utils';
import styles from '../styles/chat-widget.module.css';

type Tab = 'assistant' | 'team';

/**
 * Floating help for the public site: the AI assistant and a live line to
 * staff, behind one launcher.
 *
 * Lives in the layout rather than on a page, so both transcripts survive
 * navigation. The panel is hidden rather than unmounted when closed for the
 * same reason. The assistant tab only exists when the API has an LLM key;
 * the team tab always does, so the launcher always renders.
 */
export function ChatWidget() {
  const { t, dir } = useTranslation();
  const config = useChatConfig();
  const { user, isAuthenticated } = useSession();
  const live = useLiveSupport(user?.id ?? null);

  const assistantAvailable = Boolean(config.data?.configured);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>('assistant');
  const activeTab: Tab = assistantAvailable ? tab : 'team';

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const toggle = () => {
    // A staff reply waiting is the more likely reason someone clicked.
    if (!open && live.unread > 0) setTab('team');
    setOpen((value) => !value);
  };

  const title = activeTab === 'team' ? t('ui.liveChat.title') : t('ui.chat.title');
  const subtitle = activeTab === 'team' ? t('ui.liveChat.subtitle') : t('ui.chat.subtitle');

  return (
    <div className={styles.root} dir={dir}>
      <section className={styles.panel} role="dialog" aria-label={title} aria-modal="false" hidden={!open}>
        <header className={styles.head}>
          <span className={styles.headIcon} aria-hidden>
            {activeTab === 'team' ? (
              <Headset className={styles.headIconGlyph} />
            ) : (
              <Sparkles className={styles.headIconGlyph} />
            )}
          </span>
          <div className={styles.headText}>
            <p className={styles.headTitle}>{title}</p>
            <p className={styles.headSubtitle}>{subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.headBtn}
            onClick={() => setOpen(false)}
            aria-label={t('ui.chat.close')}
          >
            <X className={styles.headBtnGlyph} aria-hidden />
          </button>
        </header>

        {assistantAvailable ? (
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'assistant'}
              className={cn(styles.tab, activeTab === 'assistant' && styles.tabActive)}
              onClick={() => setTab('assistant')}
            >
              <Sparkles className={styles.tabGlyph} aria-hidden />
              {t('ui.chat.tabAssistant')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'team'}
              className={cn(styles.tab, activeTab === 'team' && styles.tabActive)}
              onClick={() => setTab('team')}
            >
              <Headset className={styles.tabGlyph} aria-hidden />
              {t('ui.chat.tabTeam')}
              {live.unread > 0 ? <span className={styles.tabBadge}>{live.unread}</span> : null}
            </button>
          </div>
        ) : null}

        {assistantAvailable ? <AssistantPanel active={open && activeTab === 'assistant'} /> : null}
        <LiveSupportPanel live={live} active={open && activeTab === 'team'} signedIn={isAuthenticated} />
      </section>

      <button
        type="button"
        className={styles.launcher}
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          open
            ? t('ui.chat.close')
            : live.unread > 0
              ? t('ui.liveChat.unreadLabel', { count: live.unread })
              : t('ui.chat.open')
        }
      >
        {open ? (
          <X className={styles.launcherGlyph} aria-hidden />
        ) : (
          <MessageCircle className={styles.launcherGlyph} aria-hidden />
        )}
        {!open && live.unread > 0 ? (
          <span className={styles.launcherBadge} aria-hidden>
            {live.unread > 9 ? '9+' : live.unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
