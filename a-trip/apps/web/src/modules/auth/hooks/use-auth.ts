'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, ApiError, AUTH_TOKEN_KEY } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import {
  useAdminSessionStore,
  useUserSessionStore,
  sessionStoreFor,
  type SessionScope,
} from '../stores/session.store';
import type {
  AuthSession,
  LoginPayload,
  PublicUser,
  RegisterPayload,
  UpdateProfilePayload,
} from '../interfaces/auth';

/**
 * Hydrates both the admin and the guest caches on app start, regardless of
 * which one the current route needs — either shell can mount, and the other
 * tab may already have its own session sitting in the other store's
 * localStorage key.
 */
export function useHydrateSession() {
  const hydrateUser = useUserSessionStore((s) => s.hydrate);
  const userHydrated = useUserSessionStore((s) => s.hydrated);
  const hydrateAdmin = useAdminSessionStore((s) => s.hydrate);
  const adminHydrated = useAdminSessionStore((s) => s.hydrated);
  React.useEffect(() => {
    if (!userHydrated) hydrateUser();
    if (!adminHydrated) hydrateAdmin();
  }, [hydrateUser, userHydrated, hydrateAdmin, adminHydrated]);
}

/**
 * Reads one of the two independent sessions. `scope` picks which — 'user' for
 * the public site (the default), 'admin' for the portal — and must stay the
 * same for the lifetime of the component calling this, the same way any other
 * hook argument that changes which underlying hook runs would have to.
 */
export function useSession(scope: SessionScope = 'user') {
  const store = sessionStoreFor(scope);
  const user = store((s) => s.user);
  const hydrated = store((s) => s.hydrated);
  return { user, isAuthenticated: Boolean(user), isAdmin: user?.role === 'ADMIN', hydrated };
}

/**
 * Reads `?next=` at submit time rather than through `useSearchParams`, which
 * would opt the statically rendered auth pages out of prerendering.
 *
 * Only same-site paths are accepted, so a crafted `?next=https://evil.example`
 * cannot turn the login form into an open redirect.
 */
function safeNext(): string | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('next');
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (value === '/sign-in' || value === '/admin/login') return null;
  return value;
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => apiPost<AuthSession>('/auth/login', payload),
    onSuccess: (session) => {
      const isAdminUser = session.user.role === 'ADMIN';

      // The server already decided which httpOnly cookie to set, by the same
      // rule: admin role gets the admin-scoped cookie, everyone else gets the
      // guest one. The local cache below just has to agree with that, or a
      // page read from the wrong store and rendered as if signed out.
      if (isAdminUser) {
        useAdminSessionStore.getState().setUser(session.user);
        // The one piece of this that is still a bare, JS-readable token: it
        // only ever authorizes the Next.js cache-purge ping after a content
        // edit (see use-site-content.ts), never an API call — those go
        // through the httpOnly cookie. Scoping it to admin logins only, where
        // it used to cover every signed-in user, is the actual reduction.
        try {
          window.localStorage.setItem(AUTH_TOKEN_KEY, session.accessToken);
        } catch {
          // ignore
        }
      } else {
        useUserSessionStore.getState().setUser(session.user);
      }

      queryClient.invalidateQueries();
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}`);

      const next = safeNext();
      // A guest must never be sent onward into the admin portal.
      const target = next && (isAdminUser || !next.startsWith('/admin')) ? next : null;

      router.push(target ?? (isAdminUser ? '/admin' : '/account/bookings'));
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not sign in');
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    // Registration only ever creates a guest account, so this always writes
    // the user-scoped session — never the admin one.
    mutationFn: (payload: RegisterPayload) => apiPost<AuthSession>('/auth/register', payload),
    onSuccess: (session) => {
      useUserSessionStore.getState().setUser(session.user);
      toast.success('Account created', `Welcome to A Trip, ${session.user.name.split(' ')[0]}`);
      router.push('/account/bookings');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not create your account');
    },
  });
}

/**
 * `scope` fixes which session this signs out of — the admin shell always
 * passes 'admin', everything else defaults to 'user'. Signing out of one
 * never touches the other tab's cookie or cache.
 */
export function useLogout(scope: SessionScope = 'user') {
  const clear = sessionStoreFor(scope)((s) => s.clear);
  const router = useRouter();
  const queryClient = useQueryClient();

  return (redirectTo = scope === 'admin' ? '/admin/login' : '/') => {
    // Best-effort: the cookie is httpOnly, so this is the only way to clear it.
    // The local cache is cleared either way, so the UI signs out even if the
    // request fails (offline, server restart mid-request).
    void apiPost(scope === 'admin' ? '/auth/admin-logout' : '/auth/logout').catch(() => {});
    if (scope === 'admin') {
      try {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      } catch {
        // ignore
      }
    }
    clear();
    queryClient.clear();
    router.replace(redirectTo);
  };
}

export function useUpdateProfile() {
  const setUser = useUserSessionStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => apiPatch<PublicUser>('/users/me', payload),
    onSuccess: (user) => {
      setUser(user);
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update your profile');
    },
  });
}

export function useProfile() {
  const isAuthenticated = Boolean(useUserSessionStore((s) => s.user));
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => apiGet<PublicUser>('/users/me'),
    enabled: isAuthenticated,
  });
}
