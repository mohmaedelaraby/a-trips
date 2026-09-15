/**
 * Where a live-chat socket connects, derived from the same NEXT_PUBLIC_API_URL
 * the REST client uses — so a deployment only ever configures the API once.
 *
 * The admin socket sits under `/api/admin` on purpose: that path is what makes
 * the browser attach the admin-scoped session cookie to the handshake instead
 * of the guest one.
 */
export function liveChatSocketTarget(scope: 'user' | 'admin'): { origin: string; path: string } {
  const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api');
  const prefix = api.pathname.replace(/\/+$/, '');
  return {
    origin: api.origin,
    path: `${prefix}${scope === 'admin' ? '/admin' : ''}/live-chat`,
  };
}
