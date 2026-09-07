import Link from 'next/link';
import { comingSoonHref } from '../lib/coming-soon';
import styles from '../styles/site-footer.module.css';

/**
 * `soon` entries have no destination of their own yet. They stay visually
 * quieter than a live link but remain clickable, landing on /coming-soon so a
 * visitor gets an explanation instead of a dead label.
 */
interface FooterLink {
  label: string;
  href?: string;
}

const COMPANY_LINKS: FooterLink[] = [
  { label: 'About ATrips' },
  { label: 'Contact us' },
  { label: 'Careers' },
  { label: 'Partner with us' },
];

const SUPPORT_LINKS: FooterLink[] = [
  { label: 'Help centre' },
  { label: 'Booking policy' },
  { label: 'Cancellation' },
  { label: 'Terms & privacy' },
];

function FooterLinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className={styles.linkList}>
      {links.map((link) => (
        <li key={link.label}>
          {link.href ? (
            <Link href={link.href} className={styles.link}>
              {link.label}
            </Link>
          ) : (
            <Link href={comingSoonHref(link.label)} className={styles.linkSoon}>
              {link.label}
              <span className={styles.soonTag}>Soon</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
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

        <div>
          <p className={styles.columnHeading}>Company</p>
          <FooterLinkList links={COMPANY_LINKS} />
        </div>

        <div>
          <p className={styles.columnHeading}>Support</p>
          <FooterLinkList links={SUPPORT_LINKS} />
        </div>

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
