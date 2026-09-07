'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { useSession, useLogout } from '../../modules/auth/hooks/use-auth';
import { comingSoonHref } from '../lib/coming-soon';
import { cn, initials } from '../lib/utils';
import { Logo } from './logo';
import styles from '../styles/site-header.module.css';

/**
 * `soon` entries have no page of their own yet, so they point at /coming-soon.
 * They stay dimmed to signal that, but are clickable — a dead label reads as a
 * bug, an explained one reads as a roadmap.
 */
interface NavLinkItem {
  label: string;
  href: string;
  soon?: boolean;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Hotels', href: '/hotels' },
  { label: 'About', href: comingSoonHref('About'), soon: true },
  { label: 'Contact', href: comingSoonHref('Contact'), soon: true },
  { label: 'Tours', href: comingSoonHref('Tours'), soon: true },
  { label: 'Flights', href: comingSoonHref('Flights'), soon: true },
];

function isActive(link: NavLinkItem, pathname: string) {
  if (link.soon) return false;
  return link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
}

export function SiteHeader() {
  const { user, isAuthenticated, isAdmin } = useSession();
  const logout = useLogout();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // A tap on a nav item navigates without unmounting the header, so the panel
  // has to be closed explicitly when the route changes.
  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    // Stop the page behind the panel from scrolling under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Logo inverted />

          <nav className={styles.nav}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  styles.navLink,
                  link.soon && styles.navLinkSoon,
                  isActive(link, pathname) && styles.navLinkActive,
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.actions}>
          <span className={styles.currency}>USD $</span>

          {isAuthenticated && user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button type="button" className={styles.userTrigger}>
                  <span className={styles.userAvatar}>{initials(user.name)}</span>
                  <span className={styles.userName}>{user.name.split(' ')[0]}</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} className={styles.menuContent}>
                  <DropdownMenu.Item asChild>
                    <Link href="/account/bookings" className={styles.menuItem}>
                      <UserIcon className="h-4 w-4" /> My bookings
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link href="/account/profile" className={styles.menuItem}>
                      <UserIcon className="h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenu.Item>
                  {isAdmin ? (
                    <DropdownMenu.Item asChild>
                      <Link href="/admin" className={styles.menuItem}>
                        <Menu className="h-4 w-4" /> Admin portal
                      </Link>
                    </DropdownMenu.Item>
                  ) : null}
                  <DropdownMenu.Separator className={styles.menuSeparator} />
                  <DropdownMenu.Item onSelect={() => logout()} className={styles.menuItemDanger}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <>
              <Link href="/sign-in" className={styles.signIn}>
                Sign in
              </Link>
              <Link href="/register" className={styles.register}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className={styles.mobileOverlay}
            onClick={() => setMenuOpen(false)}
          />
          <nav id="site-mobile-menu" className={styles.mobileMenu}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  styles.mobileLink,
                  isActive(link, pathname) && styles.mobileLinkActive,
                )}
              >
                {link.label}
                {link.soon ? <span className={styles.mobileSoonTag}>Soon</span> : null}
              </Link>
            ))}

            <div className={styles.mobileDivider} />

            {isAuthenticated ? (
              <>
                <Link href="/account/bookings" className={styles.mobileLink}>
                  My bookings
                </Link>
                <Link href="/account/profile" className={styles.mobileLink}>
                  Profile
                </Link>
                {isAdmin ? (
                  <Link href="/admin" className={styles.mobileLink}>
                    Admin portal
                  </Link>
                ) : null}
                <button type="button" className={styles.mobileSignOut} onClick={() => logout()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <div className={styles.mobileAuthRow}>
                <Link href="/sign-in" className={styles.mobileSignIn}>
                  Sign in
                </Link>
                <Link href="/register" className={styles.mobileRegister}>
                  Register
                </Link>
              </div>
            )}
          </nav>
        </>
      ) : null}
    </header>
  );
}
