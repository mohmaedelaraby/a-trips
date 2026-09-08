'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost, ApiError, AUTH_TOKEN_KEY } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import { SITE_CONTENT_QUERY_KEY } from '../../../shared/hooks/use-site-content';
import type { Locale } from '../../../shared/i18n/config';
import type { AdminTranslation } from '../../../shared/interfaces/site-content';

const KEY = ['admin', 'translations'];

/**
 * POST, not GET: the request carries the app's own key catalogue, since the UI
 * strings live in the web app's JSON files rather than in the database.
 */
export function useAdminTranslations(knownKeys: Array<{ key: string; context?: string }>) {
  return useQuery({
    queryKey: [...KEY, knownKeys.length],
    queryFn: () => apiPost<AdminTranslation[]>('/admin/translations/list', { knownKeys }),
  });
}

export function useUpdateTranslations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (translations: Array<{ key: string; locale: Locale; value: string }>) =>
      apiPost<{ updated: number }>('/admin/translations', { translations }),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: SITE_CONTENT_QUERY_KEY });
      // Server-rendered pages read from a cached fetch, so without this an
      // editor would save a translation and still see the old wording.
      try {
        const token =
          typeof window === 'undefined' ? null : window.localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          await fetch('/api/revalidate-site-content', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch {
        // Saved regardless; the cache clears on its own within five minutes.
      }
      toast.success(`Saved ${result.updated} translation${result.updated === 1 ? '' : 's'}`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save the translations');
    },
  });
}
