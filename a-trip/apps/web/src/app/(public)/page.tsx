'use client';

import Link from 'next/link';
import { CalendarCheck, Headset, ShieldCheck, Wallet } from 'lucide-react';
import { HotelSearchWidget } from '../../modules/hotels/components/hotel-search-widget';
import { FeaturedHotels } from '../../modules/hotels/components/featured-hotels';
import { BrowseByCity } from '../../modules/hotels/components/browse-by-city';
import { NewsletterBanner } from '../../modules/hotels/components/newsletter-banner';
import { useTranslation } from '../../shared/i18n/use-translation';
import styles from './styles/home.module.css';

const TRUST_SIGNALS = [
  { icon: ShieldCheck, title: 'Verified hotels', body: 'Every property visited by our team' },
  { icon: Wallet, title: 'Best local rates', body: 'Direct contracts, no booking fee' },
  { icon: Headset, title: '24/7 support', body: 'Real people, in Arabic and English' },
  { icon: CalendarCheck, title: 'Free cancellation', body: 'On most rooms, up to 48h before' },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={`${styles.heroContent} container-page`}>
          <h1 className={styles.heroTitle}>{t('ui.home.heroTitle')}</h1>
          <p className={styles.heroSubtitle}>340 hand-checked hotels across Egypt. Local rates, no booking fees.</p>
          <div className={styles.heroSearch}>
            <HotelSearchWidget />
          </div>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={`container-page ${styles.trustGrid}`}>
          {TRUST_SIGNALS.map((signal) => (
            <div key={signal.title} className={styles.trustItem}>
              <div className={styles.trustIcon}>
                <signal.icon className="h-4.5 w-4.5" aria-hidden />
              </div>
              <div>
                <p className={styles.trustTitle}>{signal.title}</p>
                <p className={styles.trustBody}>{signal.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`container-page ${styles.section}`}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>{t('ui.home.popularTitle')}</h2>
            <p className={styles.sectionSubtitle}>{t('ui.home.popularSubtitle')}</p>
          </div>
          <Link href="/hotels" className={styles.seeAllLink}>
            See all hotels →
          </Link>
        </div>
        <div className={styles.sectionBody}>
          <FeaturedHotels />
        </div>
      </section>

      <section className={`container-page ${styles.sectionTight}`}>
        <h2 className={styles.sectionTitle}>{t('ui.home.citiesTitle')}</h2>
        <p className={styles.sectionSubtitle}>{t('ui.home.citiesSubtitle')}</p>
        <div className={styles.sectionBody}>
          <BrowseByCity />
        </div>
      </section>

      <section className={`container-page ${styles.section}`}>
        <NewsletterBanner />
      </section>
    </div>
  );
}
