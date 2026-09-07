'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api-client';
import type { FooterLinksResponse } from '../interfaces/footer-links';

export const FOOTER_LINKS_QUERY_KEY = ['footer-links'] as const;

/**
 * The whole footer in one request.
 *
 * The root layout prefetches this on the server and seeds the cache, so in
 * practice this hook reads what is already there and issues no request at all.
 * The query remains as the fallback for when the server prefetch failed, and to
 * pick up an admin's edits within the session.
 *
 * The footer mounts on every page, so the long staleTime is what keeps it from
 * refetching on each navigation for content that changes a few times a year.
 */
export function useFooterLinks() {
  return useQuery({
    queryKey: FOOTER_LINKS_QUERY_KEY,
    queryFn: () => apiGet<FooterLinksResponse>('/footer-links'),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    // A footer is chrome: a failed fetch should not retry aggressively or push
    // an error into the page.
    retry: 1,
  });
}
