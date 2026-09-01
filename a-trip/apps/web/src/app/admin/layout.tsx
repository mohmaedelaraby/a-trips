'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminShell } from '../../modules/admin-dashboard/components/admin-shell';

/**
 * The staff sign-in page lives under /admin but must not inherit the shell:
 * AdminShell requires an authenticated admin, so wrapping the login page in it
 * bounces that page off its own auth guard.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') return <>{children}</>;

  return <AdminShell>{children}</AdminShell>;
}
