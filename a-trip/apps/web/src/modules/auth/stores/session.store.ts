import { create, type UseBoundStore, type StoreApi } from 'zustand';
import type { PublicUser } from '../interfaces/auth';

interface SessionState {
  user: PublicUser | null;
  hydrated: boolean;
  setUser: (user: PublicUser) => void;
  clear: () => void;
  hydrate: () => void;
}

/**
 * Two independent stores, not one.
 *
 * The real credential is now an httpOnly cookie the server scopes by request
 * path (see the API's session-cookie.ts) — this store only caches the *user*
 * object locally, for an instant paint before the network settles. But a
 * single shared store would undo the server-side split: signing in as an
 * admin in one tab would still overwrite what the guest tab believes about
 * itself the moment it re-hydrates from localStorage. Keeping the admin
 * portal's cache and the public site's cache under different keys is what
 * lets both stay signed in independently in two tabs of the same browser.
 */
function createSessionStore(storageKey: string): UseBoundStore<StoreApi<SessionState>> {
  return create<SessionState>((set) => ({
    user: null,
    hydrated: false,

    setUser: (user) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(user));
      } catch {
        // Storage may be unavailable (private mode); the session still works for this tab.
      }
      set({ user, hydrated: true });
    },

    clear: () => {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      set({ user: null, hydrated: true });
    },

    hydrate: () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          set({ user: JSON.parse(raw) as PublicUser, hydrated: true });
          return;
        }
      } catch {
        // fall through to clean state
      }
      set({ hydrated: true });
    },
  }));
}

export const useUserSessionStore = createSessionStore('a-trip.user');
export const useAdminSessionStore = createSessionStore('a-trip.admin.user');

export type SessionScope = 'user' | 'admin';

export function sessionStoreFor(scope: SessionScope) {
  return scope === 'admin' ? useAdminSessionStore : useUserSessionStore;
}

export function isAdmin(user: PublicUser | null): boolean {
  return user?.role === 'ADMIN';
}
