import type { CookieOptions, Request } from 'express';

/**
 * Two independent httpOnly session cookies, not one.
 *
 * A browser has exactly one cookie jar per origin — every tab shares it. With
 * a single auth cookie, signing in as an admin in one tab silently signed the
 * guest tab out (and vice versa), because the second login overwrote the
 * first token. Two differently-named, differently-scoped cookies let both
 * identities live in the jar at once: which one authenticates a request is
 * decided by the *path* it targets, not by which login happened most recently.
 *
 * `ADMIN` is scoped to `/api/admin`, so it is only ever sent to admin routes.
 * `SESSION` is scoped to the whole API (including `/api/admin`, where it
 * simply gets ignored) so ordinary guest requests keep working. This is why
 * the admin portal and the public site can each stay signed in independently
 * in two tabs of the same browser.
 */
export const SESSION_COOKIE = {
  ADMIN: 'atrips_admin_token',
  USER: 'atrips_session_token',
} as const;

/**
 * Deliberately its own env var, not `NODE_ENV === 'production'`. The runtime
 * Docker image always sets NODE_ENV=production (see apps/api/Dockerfile) even
 * though the bundled compose stack serves everything over plain
 * `http://localhost` by default — a `Secure` cookie is dropped by the browser
 * on plain HTTP, which would have made every login silently fail to persist
 * under `docker compose up` out of the box. This only turns on when the
 * deployment is actually reachable over HTTPS.
 */
const cookiesAreSecure = process.env.COOKIE_SECURE === 'true';

function cookieOptions(path: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookiesAreSecure,
    path,
    // Matches the JWT's own lifetime (see JwtModule.register) — a cookie that
    // outlives the token it carries would just fail auth silently instead of
    // being gone.
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export const ADMIN_COOKIE_OPTIONS: CookieOptions = cookieOptions('/api/admin');
export const USER_COOKIE_OPTIONS: CookieOptions = cookieOptions('/api');

/**
 * Reads the token for the given request's own scope: `/api/admin/...` reads
 * the admin cookie, everything else reads the guest one. A request is never
 * authenticated from both — that would make "which tab am I" ambiguous again.
 */
export function readSessionCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, string> | undefined;
  if (!cookies) return null;
  const isAdminRoute = req.path.startsWith('/api/admin') || req.path.startsWith('/admin');
  const token = isAdminRoute ? cookies[SESSION_COOKIE.ADMIN] : cookies[SESSION_COOKIE.USER];
  return token || null;
}
