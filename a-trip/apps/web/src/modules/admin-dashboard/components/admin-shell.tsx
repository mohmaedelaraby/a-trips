'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn, initials } from '../../../shared/lib/utils';
import { useLogout, useSession } from '../../auth/hooks/use-auth';
import { useRequireAuth } from '../../../shared/hooks/use-require-auth';
import { useAdminDashboard } from '../hooks/use-dashboard';
import { ADMIN_ROLE_LABEL } from '../interfaces/admin-users';
import { Skeleton } from '../../../shared/components/skeleton';
import styles from '../styles/admin-shell.module.css';

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  badge?: boolean;
}

const MANAGE: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/hotels', label: 'Hotels' },
  { href: '/admin/room-types', label: 'Room types' },
  { href: '/admin/availability', label: 'Availability' },
  { href: '/admin/bookings', label: 'Bookings', badge: true },
];

const SETTINGS: NavItem[] = [
  { href: '/admin/users', label: 'Admin users' },
  { href: '/admin/amenities', label: 'Amenities' },
];

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({
  item,
  pathname,
  pendingCount,
}: {
  item: NavItem;
  pathname: string;
  pendingCount?: number;
}) {
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
      {item.badge && pendingCount ? <span className={styles.navBadge}>{pendingCount}</span> : null}
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { ready } = useRequireAuth({ adminOnly: true });
  const { user } = useSession();
  const logout = useLogout();
  const pathname = usePathname();
  const dashboard = useAdminDashboard();
  const pendingCount = dashboard.data?.pendingBookings;

  if (!ready) {
    return (
      <div className={styles.loading}>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.brandWrap}>
          <Link href="/admin" className={styles.brand}>
            ATrips<span className={styles.brandDot}>.</span>
          </Link>
          <span className={styles.portal}>Admin portal</span>
        </div>

        <nav className={styles.nav}>
          <p className={styles.navSection}>Manage</p>
          {MANAGE.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} pendingCount={pendingCount} />
          ))}

          <p className={cn(styles.navSection, styles.navSectionSpaced)}>Settings</p>
          {SETTINGS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <span className={styles.avatar}>{user ? initials(user.name) : ''}</span>
            <div className={styles.userMeta}>
              <p className={styles.userName}>{user?.name}</p>
              <p className={styles.userRole}>
                {user?.adminRole ? ADMIN_ROLE_LABEL[user.adminRole] : 'Admin'}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => logout('/admin/login')} className={styles.signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        <div className={styles.mobileBar}>
          <span className={styles.brand}>
            ATrips<span className={styles.brandDot}>.</span>
          </span>
          <nav className={styles.mobileNav}>
            {[...MANAGE, ...SETTINGS].map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
