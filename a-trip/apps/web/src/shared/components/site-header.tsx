'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useSession, useLogout } from '../../modules/auth/hooks/use-auth';
import { cn, initials } from '../lib/utils';
import { Logo } from './logo';
import styles from '../styles/site-header.module.css';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Hotels', href: '/hotels' },
  { label: 'About', href: null },
  { label: 'Contact', href: null },
  { label: 'Tours', href: null },
  { label: 'Flights', href: null },
];

export function SiteHeader() {
  const { user, isAuthenticated, isAdmin } = useSession();
  const logout = useLogout();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
       

        <div className={styles.brand}>
          <Logo inverted />
          <nav className={styles.nav}>
            {NAV_LINKS.map((link) => {
              const active = link.href && (link.href === '/' ? pathname === '/' : pathname.startsWith(link.href));
              if (!link.href) {
                return (
                  <span key={link.label} className={styles.navLinkDisabled}>
                    {link.label}
                  </span>
                );
              }
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(styles.navLink, active && styles.navLinkActive)}
                >
                  {link.label}
                </Link>
              );
            })}
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
                <DropdownMenu.Content align="start" sideOffset={8} className={styles.menuContent}>
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
    </header>
  );
}
