'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, ApiError } from '../../../shared/lib/api-client';
import { toast } from '../../../shared/stores/toast.store';
import { useSessionStore } from '../stores/session.store';
import type {
  AuthSession,
  LoginPayload,
  PublicUser,
  RegisterPayload,
  UpdateProfilePayload,
} from '../interfaces/auth';

/** Reads persisted session into the store exactly once per app load. */
export function useHydrateSession() {
  const hydrate = useSessionStore((s) => s.hydrate);
  const hydrated = useSessionStore((s) => s.hydrated);
  React.useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);
}

export function useSession() {
  const user = useSessionStore((s) => s.user);
  const hydrated = useSessionStore((s) => s.hydrated);
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
  const setSession = useSessionStore((s) => s.setSession);
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => apiPost<AuthSession>('/auth/login', payload),
    onSuccess: (session) => {
      setSession(session.user, session.accessToken);
      queryClient.invalidateQueries();
      toast.success(`Welcome back, ${session.user.name.split(' ')[0]}`);

      const isAdminUser = session.user.role === 'ADMIN';
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
  const setSession = useSessionStore((s) => s.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => apiPost<AuthSession>('/auth/register', payload),
    onSuccess: (session) => {
      setSession(session.user, session.accessToken);
      toast.success('Account created', `Welcome to A Trip, ${session.user.name.split(' ')[0]}`);
      router.push('/account/bookings');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not create your account');
    },
  });
}

export function useLogout() {
  const clearSession = useSessionStore((s) => s.clearSession);
  const router = useRouter();
  const queryClient = useQueryClient();

  /** `redirectTo` lets the admin portal send staff back to the staff sign-in. */
  return (redirectTo = '/') => {
    clearSession();
    queryClient.clear();
    router.replace(redirectTo);
  };
}

export function useUpdateProfile() {
  const setSession = useSessionStore((s) => s.setSession);
  const token = useSessionStore((s) => s.token);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => apiPatch<PublicUser>('/users/me', payload),
    onSuccess: (user) => {
      if (token) setSession(user, token);
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not update your profile');
    },
  });
}

export function useProfile() {
  const isAuthenticated = Boolean(useSessionStore((s) => s.token));
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => apiGet<PublicUser>('/users/me'),
    enabled: isAuthenticated,
  });
}
