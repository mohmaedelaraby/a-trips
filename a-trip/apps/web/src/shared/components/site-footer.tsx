'use client';

import Link from 'next/link';
import { comingSoonHref } from '../lib/coming-soon';
import { useFooterLinks } from '../hooks/use-footer-links';
import {
  FOOTER_GROUP_LABEL,
  type FooterLink as FooterLinkModel,
  type FooterLinkGroup,
} from '../interfaces/footer-links';
import styles from '../styles/site-footer.module.css';

/**
 * Column order is fixed by the design; which links sit in each column, what
 * they say and where they point all come from the admin portal.
 */
const COLUMNS: FooterLinkGroup[] = ['COMPANY', 'SUPPORT'];

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function FooterLinkItem({ link }: { link: FooterLinkModel }) {
  // No destination yet: still clickable, but visibly a roadmap item.
  if (!link.href) {
    return (
      <li>
        <Link href={comingSoonHref(link.value)} className={styles.linkSoon}>
          {link.value}
          <span className={styles.soonTag}>Soon</span>
        </Link>
      </li>
    );
  }

  // An external destination leaves the app, so it gets a plain anchor and the
  // rel guard that comes with target="_blank".
  if (isExternal(link.href)) {
    return (
      <li>
        <a
          href={link.href}
          className={styles.link}
          {...(link.openInNewTab
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : { rel: 'noopener' })}
        >
          {link.value}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={link.href}
        className={styles.link}
        {...(link.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {link.value}
      </Link>
    </li>
  );
}

export function SiteFooter() {
  const { data, isLoading } = useFooterLinks();

  const linksFor = (group: FooterLinkGroup) =>
    data?.groups.find((g) => g.group === group)?.links ?? [];

  return (
    <footer className={styles.footer}>
      <div className={`container-page ${styles.grid}`}>
        <div>
          <p className={styles.brandName}>
            ATrips<span className={styles.dot}>.</span>
          </p>
          <p className={styles.tagline}>Hand-picked hotels across Egypt, booked direct at local rates.</p>
          <div className={styles.socials}>
            {['fb', 'ig', 'in'].map((label) => (
              <span key={label} className={styles.socialBadge}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {COLUMNS.map((group) => {
          const links = linksFor(group);
          return (
            <div key={group}>
              <p className={styles.columnHeading}>{FOOTER_GROUP_LABEL[group]}</p>
              {isLoading ? (
                // Placeholder rows keep the footer from collapsing and shoving
                // the page around when the links arrive.
                <ul className={styles.linkList} aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className={styles.linkPlaceholder} />
                  ))}
                </ul>
              ) : (
                <ul className={styles.linkList}>
                  {links.map((link) => (
                    <FooterLinkItem key={link.id} link={link} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        <div>
          <p className={styles.columnHeading}>Get in touch</p>
          <ul className={styles.contactList}>
            <li className={styles.contactPhone}>+20 100 000 0000</li>
            <li>hello@atrips.com</li>
            <li>Zamalek, Cairo</li>
            <li>Sun–Thu, 9:00–18:00</li>
          </ul>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={`container-page ${styles.bottomBarInner}`}>
          <p>© {new Date().getFullYear()} ATrips. All rights reserved.</p>
          <p>Prices in USD, incl. taxes unless stated.</p>
        </div>
      </div>
    </footer>
  );
}
