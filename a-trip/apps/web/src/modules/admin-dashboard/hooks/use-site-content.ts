'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ApiError,
  AUTH_TOKEN_KEY,
} from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import { SITE_CONTENT_QUERY_KEY } from '../../../shared/hooks/use-site-content';
import type {
  AdminNavLink,
  AdminSiteSetting,
  NavLinkGroup,
  NavLinkPayload,
} from '../../../shared/interfaces/site-content';

const NAV_KEY = ['admin', 'nav-links'];
const SETTINGS_KEY = ['admin', 'site-settings'];

/**
 * Drops Next's cached copy of the site chrome.
 *
 * The client cache alone is not enough: the root layout renders the nav and
 * copy on the server from a response cached for five minutes, so without this
 * an edit would not reach visitors — or a hard refresh — until that expired.
 * Best-effort, because the edit itself has already been saved.
 */
async function revalidateSiteContent() {
  try {
    const token =
      typeof window === 'undefined' ? null : window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    await fetch('/api/revalidate-site-content', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // The save succeeded; a stale cache clears on its own within five minutes.
  }
}

/**
 * Every mutation also invalidates the public feed and the server cache, so an
 * editor sees their own change reflected in the live site without a reload.
 */
function useContentMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  key: string[],
  success: string,
  fallbackError: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: SITE_CONTENT_QUERY_KEY });
      await revalidateSiteContent();
      toast.success(success);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : fallbackError);
    },
  });
}

// ------------------------------------------------------------- nav links

export function useAdminNavLinks() {
  return useQuery({
    queryKey: NAV_KEY,
    queryFn: () => apiGet<AdminNavLink[]>('/admin/nav-links'),
  });
}

export function useCreateNavLink() {
  return useContentMutation(
    (payload: NavLinkPayload) => apiPost<AdminNavLink>('/admin/nav-links', payload),
    NAV_KEY,
    'Link added',
    'Could not add the link',
  );
}

export function useUpdateNavLink() {
  return useContentMutation(
    ({ id, ...payload }: Partial<NavLinkPayload> & { id: string }) =>
      apiPatch<AdminNavLink>(`/admin/nav-links/${id}`, payload),
    NAV_KEY,
    'Link updated',
    'Could not update the link',
  );
}

export function useDeleteNavLink() {
  return useContentMutation(
    (id: string) => apiDelete<{ id: string; deleted: boolean }>(`/admin/nav-links/${id}`),
    NAV_KEY,
    'Link removed',
    'Could not remove the link',
  );
}

export function useReorderNavLinks() {
  return useContentMutation(
    ({ group, ids }: { group: NavLinkGroup; ids: string[] }) =>
      apiPatch<AdminNavLink[]>('/admin/nav-links/reorder', { group, ids }),
    NAV_KEY,
    'Order saved',
    'Could not reorder the links',
  );
}

// --------------------------------------------------------- site settings

export function useAdminSiteSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiGet<AdminSiteSetting[]>('/admin/site-settings'),
  });
}

export function useUpdateSiteSettings() {
  return useContentMutation(
    (settings: Array<{ key: string; value: string }>) =>
      apiPatch<AdminSiteSetting[]>('/admin/site-settings', { settings }),
    SETTINGS_KEY,
    'Saved',
    'Could not save these settings',
  );
}

export function useResetSiteSetting() {
  return useContentMutation(
    (key: string) => apiDelete<AdminSiteSetting[]>(`/admin/site-settings/${key}`),
    SETTINGS_KEY,
    'Restored the default',
    'Could not restore the default',
  );
}
