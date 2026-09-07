import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Clears the cached site chrome after an admin edits it.
 *
 * The root layout fetches /site-content with `revalidate: 300`, which is what
 * makes it one upstream call shared by every visitor. Without this route an
 * admin would save a change and still see the old copy for up to five minutes,
 * with no way to tell whether it had worked.
 *
 * Anyone could otherwise call this and force a refetch on every request, so the
 * caller's token is checked against the API first — only an admin can bust the
 * cache.
 */
function apiBase(): string {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api'
  );
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ revalidated: false, reason: 'unauthenticated' }, { status: 401 });
  }

  let role: string | undefined;
  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ revalidated: false, reason: 'unauthenticated' }, { status: 401 });
    }
    const body = (await res.json()) as { data?: { role?: string } };
    role = body.data?.role;
  } catch {
    return NextResponse.json({ revalidated: false, reason: 'api unreachable' }, { status: 503 });
  }

  if (role !== 'ADMIN') {
    return NextResponse.json({ revalidated: false, reason: 'forbidden' }, { status: 403 });
  }

  // `{ expire: 0 }` rather than a named profile: an admin who just saved should
  // see the change now, not after a window of stale content.
  revalidateTag('site-content', { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
