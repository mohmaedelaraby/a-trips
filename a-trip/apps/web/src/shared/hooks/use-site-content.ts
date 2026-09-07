'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api-client';
import type { NavLink, NavLinkGroup, SiteContent } from '../interfaces/site-content';

export const SITE_CONTENT_QUERY_KEY = ['site-content'] as const;

/**
 * The whole site chrome — header nav, footer nav and editable copy — in one
 * request.
 *
 * The root layout prefetches this on the server and seeds the cache, so in
 * practice this hook reads what is already there and issues no request at all.
 * The query remains as the fallback for when the server prefetch failed, and to
 * pick up an admin's edits within the session.
 */
export function useSiteContent() {
  return useQuery({
    queryKey: SITE_CONTENT_QUERY_KEY,
    queryFn: () => apiGet<SiteContent>('/site-content'),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    // Site chrome: a failed fetch should not retry hard or surface an error.
    retry: 1,
  });
}

/** Links for one region, or an empty list while the content loads. */
export function useNavLinks(group: NavLinkGroup): { links: NavLink[]; isLoading: boolean } {
  const { data, isLoading } = useSiteContent();
  return {
    links: data?.groups.find((g) => g.group === group)?.links ?? [],
    isLoading,
  };
}

/**
 * One editable string. `fallback` is what renders if the API is unreachable —
 * always pass the copy the page shipped with, never an empty string.
 */
export function useSetting(key: string, fallback = ''): string {
  const { data } = useSiteContent();
  return data?.settings?.[key] ?? fallback;
}
