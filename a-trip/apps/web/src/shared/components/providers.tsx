'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHydrateSession } from '../../modules/auth/hooks/use-auth';
import { Toaster } from './toaster';

function SessionBoundary({ children }: { children: React.ReactNode }) {
  useHydrateSession();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionBoundary>
        {children}
        <Toaster />
      </SessionBoundary>
    </QueryClientProvider>
  );
}
