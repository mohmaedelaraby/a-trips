'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, CalendarCheck, KeyRound, UserCog } from 'lucide-react';
import { useSession, useLogout } from '../hooks/use-auth';
import { comingSoonHref } from '../../../shared/lib/coming-soon';
import { cn, initials } from '../../../shared/lib/utils';
import styles from '../styles/account-shell.module.css';

/** `soon` items are not built yet and route to /coming-soon instead of nowhere. */
const NAV = [
  { label: 'My bookings', href: '/account/bookings', icon: CalendarCheck, soon: false },
  { label: 'Profile & settings', href: '/account/profile', icon: UserCog, soon: false },
  { label: 'Saved hotels', href: comingSoonHref('Saved hotels'), icon: Bookmark, soon: true },
  { label: 'Password', href: comingSoonHref('Password'), icon: KeyRound, soon: true },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const logout = useLogout();
  const pathname = usePathname();

  const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

  return (
    <div className={`container-page ${styles.page}`}>
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div>
            <div className={styles.profileRow}>
              <span className={styles.avatar}>{user ? initials(user.name) : '··'}</span>
              <div className={styles.profileMeta}>
                <p className={styles.name}>{user?.name ?? 'Loading…'}</p>
                <p className={styles.memberSince}>Member since {memberSince}</p>
              </div>
            </div>

            {/* Below the sidebar breakpoint this becomes a horizontal, swipeable
                rail so the nav never pushes the page content off-screen. */}
            <nav className={`${styles.nav} no-scrollbar`}>
              {NAV.map((item) => {
                const active = !item.soon && pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      styles.navItem,
                      active ? styles.navItemActive : styles.navItemInactive,
                      item.soon && styles.navItemSoon,
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.soon ? <span className={styles.soonTag}>Soon</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <button type="button" onClick={() => logout()} className={styles.signOut}>
            Sign out
          </button>
        </aside>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
