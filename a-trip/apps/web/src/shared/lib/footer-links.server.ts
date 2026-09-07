import type { FooterLinksResponse } from '../interfaces/footer-links';
import type { ApiResponse } from '../interfaces/api';

/**
 * Server-side fetch of the footer feed, used to prefetch it in the root layout.
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

export async function fetchFooterLinks(): Promise<FooterLinksResponse> {
  const empty: FooterLinksResponse = { groups: [] };
  try {
    const res = await fetch(`${serverApiBase()}/footer-links`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['footer-links'] },
    });
    if (!res.ok) return empty;
    const body = (await res.json()) as ApiResponse<FooterLinksResponse>;
    return body.data ?? empty;
  } catch {
    // The footer is chrome. If the API is unreachable at render time the page
    // still ships; the client query will fill it in.
    return empty;
  }
}
