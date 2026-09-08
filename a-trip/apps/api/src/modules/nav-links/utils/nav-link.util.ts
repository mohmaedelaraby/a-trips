import { BadRequestException } from '@nestjs/common';
import { NavLinkGroup } from '../../../generated/prisma/enums';

/** Translation key for one link's label, keyed by id. */
export const NAV_KEY_PREFIX = 'nav.';

export function navTranslationKey(id: string): string {
  return `${NAV_KEY_PREFIX}${id}`;
}

export function navIdFromKey(key: string): string {
  return key.slice(NAV_KEY_PREFIX.length);
}

/** Position first, then label, so links without an explicit order stay stable. */
export const NAV_ORDER = [{ sortOrder: 'asc' }, { value: 'asc' }] as const;

export interface PublicNavLink {
  id: string;
  group: NavLinkGroup;
  value: string;
  href: string | null;
  openInNewTab: boolean;
}

/**
 * Buckets links by group for the site to render straight from the payload.
 *
 * Grouped server-side so the client needs no re-sorting or bucketing, and so
 * adding a group later does not require a matching change in the web app.
 */
export function groupNavLinks(rows: PublicNavLink[]) {
  const groups: Record<NavLinkGroup, PublicNavLink[]> = {
    HEADER: [],
    FOOTER_COMPANY: [],
    FOOTER_SUPPORT: [],
  };
  for (const row of rows) groups[row.group].push(row);

  return {
    groups: (Object.keys(groups) as NavLinkGroup[]).map((group) => ({
      group,
      links: groups[group].map(({ group: _group, ...link }) => link),
    })),
  };
}

/** Groups flat translation rows into `{ id: { LOCALE: value } }`. */
export function groupTranslationsById(
  rows: Array<{ key: string; locale: string; value: string }>,
): Map<string, Record<string, string>> {
  const byId = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const id = navIdFromKey(row.key);
    const entry = byId.get(id) ?? {};
    entry[row.locale] = row.value;
    byId.set(id, entry);
  }
  return byId;
}

/**
 * Blank means "no destination yet", stored as null so the site can route it to
 * /coming-soon. Anything else must be a site-relative path or an http(s) URL — a
 * bare "example.com" would resolve against our own origin, and `javascript:` is
 * an XSS vector once this string reaches an href.
 */
export function normalizeHref(href: string | null | undefined): string | null {
  if (href === undefined || href === null) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;

  throw new BadRequestException(
    'Link must start with "/" for a page on this site, or with http:// or https:// for an external site',
  );
}
