'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { cn, initials } from '../../../shared/lib/utils';
import { useLogout, useSession } from '../../auth/hooks/use-auth';
import { useRequireAuth } from '../../../shared/hooks/use-require-auth';
import { useAdminDashboard } from '../hooks/use-dashboard';
import { ADMIN_ROLE_LABEL } from '../interfaces/admin-users';
import { Skeleton } from '../../../shared/components/skeleton';
import {
  AdminLiveChatProvider,
  useAdminLiveChat,
} from '../../live-chat/components/admin-live-chat-provider';
import styles from '../styles/admin-shell.module.css';

/** Which live count a nav item shows next to its label. */
type BadgeSource = 'bookings' | 'liveChat';

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  badge?: BadgeSource;
}

type Badges = Partial<Record<BadgeSource, number>>;

const MANAGE: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/hotels', label: 'Hotels' },
  { href: '/admin/room-types', label: 'Room types' },
  { href: '/admin/availability', label: 'Availability' },
  { href: '/admin/bookings', label: 'Bookings', badge: 'bookings' },
  { href: '/admin/live-chat', label: 'Live chat', badge: 'liveChat' },
];

const SETTINGS: NavItem[] = [
  { href: '/admin/users', label: 'Admin users' },
  { href: '/admin/amenities', label: 'Amenities' },
  { href: '/admin/nav-links', label: 'Navigation links' },
  { href: '/admin/site-settings', label: 'Site content' },
  { href: '/admin/translations', label: 'Translations' },
];

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({ item, pathname, badges }: { item: NavItem; pathname: string; badges?: Badges }) {
  const count = item.badge ? badges?.[item.badge] : undefined;
  const active = isActive(item, pathname);
  return (
    <Link
      href={item.href}
      className={cn(styles.navLink, active && styles.navLinkActive)}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.navLabel}>
        <span className={cn(styles.navDot, active && styles.navDotActive)} aria-hidden />
        {item.label}
      </span>
      {count ? <span className={styles.navBadge}>{count}</span> : null}
    </Link>
  );
}

/**
 * Brand block, grouped nav and user footer. Shared verbatim between the fixed
 * desktop sidebar and the mobile drawer so the two can never drift apart.
 */
function SidebarBody({
  pathname,
  badges,
  userName,
  userRole,
  onSignOut,
}: {
  pathname: string;
  badges?: Badges;
  userName?: string;
  userRole: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className={styles.brandWrap}>
        <Link href="/admin" className={styles.brand}>
          ATrips<span className={styles.brandDot}>.</span>
        </Link>
        <span className={styles.portal}>Admin portal</span>
      </div>

      <nav className={styles.nav}>
        <p className={styles.navSection}>Manage</p>
        {MANAGE.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} badges={badges} />
        ))}

        <p className={cn(styles.navSection, styles.navSectionSpaced)}>Settings</p>
        {SETTINGS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userRow}>
          <span className={styles.avatar}>{userName ? initials(userName) : ''}</span>
          <div className={styles.userMeta}>
            <p className={styles.userName}>{userName}</p>
            <p className={styles.userRole}>{userRole}</p>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className={styles.signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { ready } = useRequireAuth({ adminOnly: true });

  if (!ready) {
    return (
      <div className={styles.loading}>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Only once the admin session is confirmed: the live-chat socket
  // authenticates with that session's cookie, and would just be refused
  // before it exists.
  return (
    <AdminLiveChatProvider>
      <AdminShellFrame>{children}</AdminShellFrame>
    </AdminLiveChatProvider>
  );
}

function AdminShellFrame({ children }: { children: ReactNode }) {
  const { user } = useSession('admin');
  const logout = useLogout('admin');
  const pathname = usePathname();
  const dashboard = useAdminDashboard();
  const pendingCount = dashboard.data?.pendingBookings;
  const { totalUnread } = useAdminLiveChat();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Navigating from inside the drawer does not unmount the shell, so the panel
  // has to be closed explicitly whenever the route changes.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const sidebar = (
    <SidebarBody
      pathname={pathname}
      badges={{ bookings: pendingCount, liveChat: totalUnread }}
      userName={user?.name}
      userRole={user?.adminRole ? ADMIN_ROLE_LABEL[user.adminRole] : 'Admin'}
      onSignOut={() => logout('/admin/login')}
    />
  );

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>{sidebar}</aside>

      <div className={styles.content}>
        <div className={styles.mobileBar}>
          <button
            type="button"
            className={styles.drawerTrigger}
            aria-label="Open admin menu"
            aria-expanded={drawerOpen}
            aria-controls="admin-mobile-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
            {pendingCount || totalUnread ? <span className={styles.triggerBadge} aria-hidden /> : null}
          </button>

          <Link href="/admin" className={styles.brand}>
            ATrips<span className={styles.brandDot}>.</span>
          </Link>

          <span className={styles.mobileUser}>{user ? initials(user.name) : ''}</span>
        </div>

        {drawerOpen ? (
          <div className={styles.drawerRoot}>
            <button
              type="button"
              aria-label="Close admin menu"
              className={styles.drawerOverlay}
              onClick={() => setDrawerOpen(false)}
            />
            <aside id="admin-mobile-drawer" className={styles.drawer}>
              <button
                type="button"
                className={styles.drawerClose}
                aria-label="Close admin menu"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
