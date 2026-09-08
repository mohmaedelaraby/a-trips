'use client';

import Link from 'next/link';
import { comingSoonHref } from '../lib/coming-soon';
import { useNavLinks, useSetting } from '../hooks/use-site-content';
import { useTranslation } from '../i18n/use-translation';
import { NAV_GROUP_LABEL, type NavLink as NavLinkModel, type NavLinkGroup } from '../interfaces/site-content';
import styles from '../styles/site-footer.module.css';

/** Column order is fixed by the design; their contents come from the portal. */
const COLUMNS: NavLinkGroup[] = ['FOOTER_COMPANY', 'FOOTER_SUPPORT'];

/** Column headings, which are layout rather than editable copy. */
const COLUMN_HEADING_KEY: Record<string, string> = {
  FOOTER_COMPANY: 'ui.footer.company',
  FOOTER_SUPPORT: 'ui.footer.support',
};

const SOCIALS: Array<{ key: string; label: string; name: string }> = [
  { key: 'social.facebook', label: 'fb', name: 'Facebook' },
  { key: 'social.instagram', label: 'ig', name: 'Instagram' },
  { key: 'social.linkedin', label: 'in', name: 'LinkedIn' },
];

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

export function NavLinkItem({ link, className }: { link: NavLinkModel; className?: string }) {
  const { t } = useTranslation();
  // No destination yet: still clickable, but visibly a roadmap item.
  if (!link.href) {
    return (
      <Link href={comingSoonHref(link.value)} className={styles.linkSoon}>
        {link.value}
        <span className={styles.soonTag}>{t('ui.common.soon')}</span>
      </Link>
    );
  }

  // An external destination leaves the app, so it gets a plain anchor and the
  // rel guard that comes with target="_blank".
  if (isExternal(link.href)) {
    return (
      <a
        href={link.href}
        className={className ?? styles.link}
        {...(link.openInNewTab
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : { rel: 'noopener' })}
      >
        {link.value}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      className={className ?? styles.link}
      {...(link.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {link.value}
    </Link>
  );
}

function FooterColumn({ group }: { group: NavLinkGroup }) {
  const { links, isLoading } = useNavLinks(group);
  const { t } = useTranslation();

  return (
    <div>
      <p className={styles.columnHeading}>
        {COLUMN_HEADING_KEY[group] ? t(COLUMN_HEADING_KEY[group]) : NAV_GROUP_LABEL[group]}
      </p>
      {isLoading ? (
        // Placeholders hold the column's height so the page does not jump.
        <ul className={styles.linkList} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.linkPlaceholder} />
          ))}
        </ul>
      ) : (
        <ul className={styles.linkList}>
          {links.map((link) => (
            <li key={link.id}>
              <NavLinkItem link={link} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  // Fallbacks are the copy this page shipped with, so an unreachable API
  // degrades to the original wording rather than blanks.
  const tagline = useSetting(
    'footer.tagline',
    'Hand-picked hotels across Egypt, booked direct at local rates.',
  );
  const legal = useSetting('footer.legal', 'Prices in USD, incl. taxes unless stated.');
  const phone = useSetting('contact.phone', '+20 100 000 0000');
  const email = useSetting('contact.email', 'hello@atrips.com');
  const address = useSetting('contact.address', 'Zamalek, Cairo');
  const hours = useSetting('contact.hours', 'Sun–Thu, 9:00–18:00');

  const facebook = useSetting('social.facebook');
  const instagram = useSetting('social.instagram');
  const linkedin = useSetting('social.linkedin');
  const socialUrls: Record<string, string> = {
    'social.facebook': facebook,
    'social.instagram': instagram,
    'social.linkedin': linkedin,
  };

  return (
    <footer className={styles.footer}>
      <div className={`container-page ${styles.grid}`}>
        <div>
          <p className={styles.brandName}>
            ATrips<span className={styles.dot}>.</span>
          </p>
          <p className={styles.tagline}>{tagline}</p>
          <div className={styles.socials}>
            {SOCIALS.map((social) => {
              const url = socialUrls[social.key];
              // A badge with no URL configured stays a badge, not a dead link.
              return url ? (
                <a
                  key={social.key}
                  href={url}
                  className={styles.socialBadge}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                >
                  {social.label}
                </a>
              ) : (
                <span key={social.key} className={styles.socialBadge} aria-label={social.name}>
                  {social.label}
                </span>
              );
            })}
          </div>
        </div>

        {COLUMNS.map((group) => (
          <FooterColumn key={group} group={group} />
        ))}

        <div>
          <p className={styles.columnHeading}>{t('ui.footer.getInTouch')}</p>
          <ul className={styles.contactList}>
            <li className={styles.contactPhone}>{phone}</li>
            <li>{email}</li>
            <li>{address}</li>
            <li>{hours}</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={`container-page ${styles.bottomBarInner}`}>
          <p>
            © {new Date().getFullYear()} ATrips. {t('ui.footer.rights')}
          </p>
          <p>{legal}</p>
        </div>
      </div>
    </footer>
  );
}
