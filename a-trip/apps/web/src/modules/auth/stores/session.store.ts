import { create } from 'zustand';
import { AUTH_TOKEN_KEY } from '../../../shared/lib/api-client';
import type { PublicUser } from '../interfaces/auth';

interface SessionState {
  user: PublicUser | null;
  token: string | null;
  hydrated: boolean;
  setSession: (user: PublicUser, token: string) => void;
  clearSession: () => void;
  hydrate: () => void;
}

const USER_KEY = 'a-trip.user';

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  setSession: (user, token) => {
    try {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // Storage may be unavailable (private mode); the session still works for this tab.
    }
    set({ user, token, hydrated: true });
  },

  clearSession: () => {
    try {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    set({ user: null, token: null, hydrated: true });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      const rawUser = window.localStorage.getItem(USER_KEY);
      if (token && rawUser) {
        set({ token, user: JSON.parse(rawUser) as PublicUser, hydrated: true });
        return;
      }
    } catch {
      // fall through to clean state
    }
    set({ hydrated: true });
  },
}));

export function isAdmin(user: PublicUser | null): boolean {
  return user?.role === 'ADMIN';
}
