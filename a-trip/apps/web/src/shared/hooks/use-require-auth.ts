'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '../../modules/auth/hooks/use-auth';

/** Redirects to sign-in once the session is known and there is no user. */
export function useRequireAuth({ adminOnly = false }: { adminOnly?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, isAdmin } = useSession();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      const signInPath = adminOnly ? '/admin/login' : '/sign-in';
      // Never point `next` at a sign-in page — that is how a bounced login page
      // ends up redirecting to itself.
      const isSignInPath = pathname === signInPath || pathname === '/sign-in';
      router.replace(isSignInPath ? signInPath : `${signInPath}?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (adminOnly && !isAdmin) {
      router.replace('/');
    }
  }, [hydrated, user, isAdmin, adminOnly, router, pathname]);

  return { user, ready: hydrated && Boolean(user) && (!adminOnly || isAdmin) };
}
