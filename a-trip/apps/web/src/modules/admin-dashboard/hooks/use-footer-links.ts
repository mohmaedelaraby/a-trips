'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import type {
  AdminFooterLink,
  FooterLinkGroup,
  FooterLinkPayload,
} from '../../../shared/interfaces/footer-links';

const KEY = ['admin', 'footer-links'];

/**
 * Every mutation invalidates the public feed too, so an editor sees their own
 * change reflected in the site footer without a reload.
 */
function useFooterMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  success: string,
  fallbackError: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['footer-links'] });
      toast.success(success);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : fallbackError);
    },
  });
}

export function useAdminFooterLinks() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiGet<AdminFooterLink[]>('/admin/footer-links'),
  });
}

export function useCreateFooterLink() {
  return useFooterMutation(
    (payload: FooterLinkPayload) => apiPost<AdminFooterLink>('/admin/footer-links', payload),
    'Link added',
    'Could not add the link',
  );
}

export function useUpdateFooterLink() {
  return useFooterMutation(
    ({ id, ...payload }: Partial<FooterLinkPayload> & { id: string }) =>
      apiPatch<AdminFooterLink>(`/admin/footer-links/${id}`, payload),
    'Link updated',
    'Could not update the link',
  );
}

export function useDeleteFooterLink() {
  return useFooterMutation(
    (id: string) => apiDelete<{ id: string; deleted: boolean }>(`/admin/footer-links/${id}`),
    'Link removed',
    'Could not remove the link',
  );
}

export function useReorderFooterLinks() {
  return useFooterMutation(
    ({ group, ids }: { group: FooterLinkGroup; ids: string[] }) =>
      apiPatch<AdminFooterLink[]>('/admin/footer-links/reorder', { group, ids }),
    'Order saved',
    'Could not reorder the links',
  );
}
