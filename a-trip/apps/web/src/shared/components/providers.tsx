'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHydrateSession } from '../../modules/auth/hooks/use-auth';
import { SITE_CONTENT_QUERY_KEY } from '../hooks/use-site-content';
import { LocaleContext } from '../i18n/locale-context';
import { DEFAULT_LOCALE, type Locale } from '../i18n/config';
import type { SiteContent } from '../interfaces/site-content';
import { Toaster } from './toaster';

function SessionBoundary({ children }: { children: React.ReactNode }) {
  useHydrateSession();
  return <>{children}</>;
}

export function Providers({
  children,
  siteContent,
  locale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  /** Prefetched on the server so nav and copy render without a client round trip. */
  siteContent?: SiteContent;
  /** Resolved from the cookie on the server, so SSR is already in-language. */
  locale?: Locale;
}) {
  const [queryClient] = React.useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      },
    });
    // Seeding the cache rather than passing props down means useFooterLinks()
    // works identically whether or not the server managed to prefetch.
    if (siteContent && (siteContent.groups.length || Object.keys(siteContent.settings ?? {}).length)) {
      client.setQueryData([...SITE_CONTENT_QUERY_KEY, locale], siteContent);
    }
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleContext.Provider value={locale}>
        <SessionBoundary>
          {children}
          <Toaster />
        </SessionBoundary>
      </LocaleContext.Provider>
    </QueryClientProvider>
  );
}
