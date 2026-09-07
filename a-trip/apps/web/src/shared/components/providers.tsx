'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHydrateSession } from '../../modules/auth/hooks/use-auth';
import { FOOTER_LINKS_QUERY_KEY } from '../hooks/use-footer-links';
import type { FooterLinksResponse } from '../interfaces/footer-links';
import { Toaster } from './toaster';

function SessionBoundary({ children }: { children: React.ReactNode }) {
  useHydrateSession();
  return <>{children}</>;
}

export function Providers({
  children,
  footerLinks,
}: {
  children: React.ReactNode;
  /** Prefetched on the server so the footer renders without a client round trip. */
  footerLinks?: FooterLinksResponse;
}) {
  const [queryClient] = React.useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      },
    });
    // Seeding the cache rather than passing props down means useFooterLinks()
    // works identically whether or not the server managed to prefetch.
    if (footerLinks?.groups.length) {
      client.setQueryData(FOOTER_LINKS_QUERY_KEY, footerLinks);
    }
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBoundary>
        {children}
        <Toaster />
      </SessionBoundary>
    </QueryClientProvider>
  );
}
