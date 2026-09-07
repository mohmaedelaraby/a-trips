export const FooterLinkGroup = {
  COMPANY: 'COMPANY',
  SUPPORT: 'SUPPORT',
} as const;
export type FooterLinkGroup = (typeof FooterLinkGroup)[keyof typeof FooterLinkGroup];

export const FOOTER_GROUP_LABEL: Record<FooterLinkGroup, string> = {
  COMPANY: 'Company',
  SUPPORT: 'Support',
};

/** One footer link as the public feed returns it. */
export interface FooterLink {
  id: string;
  value: string;
  /** Null means the destination is not built yet — the site routes to /coming-soon. */
  href: string | null;
  openInNewTab: boolean;
}

export interface FooterLinkGroupPayload {
  group: FooterLinkGroup;
  links: FooterLink[];
}

/** The whole footer, delivered in a single request. */
export interface FooterLinksResponse {
  groups: FooterLinkGroupPayload[];
}

/** Admin rows carry the editing fields the public feed omits. */
export interface AdminFooterLink extends FooterLink {
  group: FooterLinkGroup;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FooterLinkPayload {
  group: FooterLinkGroup;
  value: string;
  href?: string | null;
  openInNewTab?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}
