'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '../../../shared/hooks/use-require-auth';
import { AccountShell } from '../../../modules/auth/components/account-shell';
import { Skeleton } from '../../../shared/components/skeleton';
import styles from '../styles/account.module.css';

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <div className={`container-page ${styles.loadingWrap}`}>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <AccountShell>{children}</AccountShell>;
}
