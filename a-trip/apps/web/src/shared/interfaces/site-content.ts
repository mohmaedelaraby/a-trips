export const NavLinkGroup = {
  HEADER: 'HEADER',
  FOOTER_COMPANY: 'FOOTER_COMPANY',
  FOOTER_SUPPORT: 'FOOTER_SUPPORT',
} as const;
export type NavLinkGroup = (typeof NavLinkGroup)[keyof typeof NavLinkGroup];

export const NAV_GROUP_LABEL: Record<NavLinkGroup, string> = {
  HEADER: 'Header bar',
  FOOTER_COMPANY: 'Footer — Company',
  FOOTER_SUPPORT: 'Footer — Support',
};

/** One navigation link as the public feed returns it. */
export interface NavLink {
  id: string;
  value: string;
  /** Null means the destination is not built yet — the site routes to /coming-soon. */
  href: string | null;
  openInNewTab: boolean;
}

export interface NavLinkGroupPayload {
  group: NavLinkGroup;
  links: NavLink[];
}

/**
 * Everything the site chrome needs, delivered in a single request: the
 * navigation for header and footer, plus the editable copy.
 */
export interface SiteContent {
  groups: NavLinkGroupPayload[];
  settings: Record<string, string>;
  /** ui.* overrides from the admin, layered over the shipped JSON. */
  translations: Record<string, string>;
  locale: string;
  dir: 'ltr' | 'rtl';
}

/** Admin rows carry the editing fields the public feed omits. */
export interface AdminNavLink extends NavLink {
  /** Per-locale labels, e.g. { AR: 'الفنادق' }. */
  translations?: Record<string, string>;
  group: NavLinkGroup;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NavLinkPayload {
  translations?: Record<string, string>;
  group: NavLinkGroup;
  value: string;
  href?: string | null;
  openInNewTab?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminSiteSetting {
  key: string;
  group: string;
  label: string;
  value: string;
  /** True while no override is stored and the shipped copy is showing. */
  isDefault: boolean;
}

/** One key with its value in every locale, for the translation editor. */
export interface AdminTranslation {
  key: string;
  namespace: string;
  context: string | null;
  values: Record<'EN' | 'AR', string>;
  /** True when nothing is stored for any locale — the shipped copy applies. */
  isDefault: boolean;
}
