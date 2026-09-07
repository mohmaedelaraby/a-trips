import type { SiteContent } from '../interfaces/site-content';
import type { ApiResponse } from '../interfaces/api';

/**
 * Server-side fetch of the site chrome, used to prefetch it in the root layout.
 *
 * Deliberately plain `fetch` rather than the axios client: that one reads the
 * auth token from localStorage and has no meaning on the server. Using fetch
 * also lets Next cache the response, so this is one upstream call shared by
 * every visitor rather than one per session.
 *
 * On the server the API is reached over the internal network, which inside
 * Docker is a different host from the browser-facing NEXT_PUBLIC_API_URL.
 */
const REVALIDATE_SECONDS = 300;

function serverApiBase(): string {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api'
  );
}

export async function fetchSiteContent(): Promise<SiteContent> {
  const empty: SiteContent = { groups: [], settings: {} };
  try {
    const res = await fetch(`${serverApiBase()}/site-content`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['site-content'] },
    });
    if (!res.ok) return empty;
    const body = (await res.json()) as ApiResponse<SiteContent>;
    return body.data ?? empty;
  } catch {
    // Chrome only. If the API is unreachable at render time the page still
    // ships; the client query fills it in and components use their fallbacks.
    return empty;
  }
}
