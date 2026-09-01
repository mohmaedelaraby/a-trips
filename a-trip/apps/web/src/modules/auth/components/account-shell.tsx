'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, CalendarCheck, KeyRound, UserCog } from 'lucide-react';
import { useSession, useLogout } from '../hooks/use-auth';
import { cn, initials } from '../../../shared/lib/utils';
import styles from '../styles/account-shell.module.css';

const NAV = [
  { label: 'My bookings', href: '/account/bookings', icon: CalendarCheck },
  { label: 'Profile & settings', href: '/account/profile', icon: UserCog },
  { label: 'Saved hotels', href: null, icon: Bookmark },
  { label: 'Password', href: null, icon: KeyRound },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const logout = useLogout();
  const pathname = usePathname();

  const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

  return (
    <div className="container-page py-8">
      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div>
            <div className={styles.profileRow}>
              <span className={styles.avatar}>{user ? initials(user.name) : '··'}</span>
              <div className="min-w-0">
                <p className={styles.name}>{user?.name ?? 'Loading…'}</p>
                <p className={styles.memberSince}>Member since {memberSince}</p>
              </div>
            </div>

            <nav className={styles.nav}>
              {NAV.map((item) => {
                const active = item.href && pathname.startsWith(item.href);
                if (!item.href) {
                  return (
                    <span key={item.label} className={cn(styles.navItem, styles.navItemDisabled)}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(styles.navItem, active ? styles.navItemActive : styles.navItemInactive)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
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
