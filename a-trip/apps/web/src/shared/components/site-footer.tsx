import Link from 'next/link';
import styles from '../styles/site-footer.module.css';

const COMPANY_LINKS = [
  { label: 'About ATrips', href: null },
  { label: 'Contact us', href: null },
  { label: 'Careers', href: null },
  { label: 'Partner with us', href: null },
];

const SUPPORT_LINKS = [
  { label: 'Help centre', href: null },
  { label: 'Booking policy', href: null },
  { label: 'Cancellation', href: null },
  { label: 'Terms & privacy', href: null },
];

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
          <ul className={styles.linkList}>
            {COMPANY_LINKS.map((link) =>
              link.href ? (
                <li key={link.label}>
                  <Link href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ) : (
                <li key={link.label} className={styles.linkDisabled}>
                  {link.label}
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <p className={styles.columnHeading}>Support</p>
          <ul className={styles.linkList}>
            {SUPPORT_LINKS.map((link) =>
              link.href ? (
                <li key={link.label}>
                  <Link href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                </li>
              ) : (
                <li key={link.label} className={styles.linkDisabled}>
                  {link.label}
                </li>
              ),
            )}
          </ul>
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
