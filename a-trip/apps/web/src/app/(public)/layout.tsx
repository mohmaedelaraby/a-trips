'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteHeader } from '../../shared/components/site-header';
import { SiteFooter } from '../../shared/components/site-footer';
import { ChatWidget } from '../../modules/chat/components/chat-widget';
import styles from './styles/layout.module.css';

const STANDALONE_PREFIXES = ['/checkout', '/booking/', '/sign-in', '/register', '/forgot-password'];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const standalone = STANDALONE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Checkout and the auth pages are deliberately distraction-free, so the
  // assistant stays out of them too — nothing should sit over a payment step.
  if (standalone) {
    return <div className={styles.shell}>{children}</div>;
  }

  return (
    <div className={styles.shell}>
      <SiteHeader />
      <main className={styles.main}>{children}</main>
      <SiteFooter />
      {/* In the layout, not a page: the transcript then survives navigation. */}
      <ChatWidget />
    </div>
  );
}
